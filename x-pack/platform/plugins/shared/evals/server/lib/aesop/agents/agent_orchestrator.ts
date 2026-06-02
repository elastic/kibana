/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { lastValueFrom, timeout, catchError, filter, map, of, defaultIfEmpty } from 'rxjs';
import { ChatEventType, isMessageCompleteEvent, type ChatEvent } from '@kbn/agent-builder-common';
import { trace } from '@opentelemetry/api';

import { withAesopSpan } from '../monitoring/tracing';
import { parseSkillsFromResponse } from './skill_response_parser';

/**
 * Why `agentBuilderStart` is typed as `any` here:
 *
 * The `evals` plugin and `agent_builder` plugin form a project-reference cycle
 * (agent_builder optionally depends on evals for the skill-eval surface), so
 * we cannot `import type { AgentBuilderPluginStart }` directly. The plugin
 * boundary uses {@link AgentBuilderContractLike} (`Record<string, any>`) and
 * we honor the same erasure here. The runtime contract this orchestrator
 * actually relies on is a thin slice — `agentBuilderStart.execution.executeAgent({...}) → { executionId, events$: Observable<ChatEvent> }`.
 *
 * Tracked as tech debt: extract the contract into a shared
 * `@kbn/evals-agent-builder-contract` package so both sides can import a
 * real type. Until then, the events-pipeline types below give us the
 * material safety: filter/map/timeout are typed against `ChatEvent`, so
 * any future event-shape change in agent_builder will fail compilation
 * here even with the `any` boundary.
 */
export interface AgentOrchestrationConfig {
  agentBuilderStart: any;
  request: KibanaRequest;
  connectorId: string;
  logger: Logger;
  timeoutMs?: number;
  executionId?: string; // For tagging conversations
  onProgress?: (phase: string, step: number, totalSteps: number, message: string) => Promise<void>;
}

export class AgentOrchestrator {
  private readonly timeoutMs: number;

  constructor(private readonly config: AgentOrchestrationConfig) {
    // Default to 10 minutes per agent — Opus-class reasoning models with deep
    // tool use (schema-explorer, skill-generator) can easily run 3–5+ minutes
    // per call. 120s was too aggressive and caused silent skill-synthesis
    // failures during demos.
    this.timeoutMs = config.timeoutMs || 600_000;
  }

  async executeAgent(agentId: string, message: string): Promise<string> {
    const { agentBuilderStart, request, connectorId, logger } = this.config;

    logger.info(`[AESOP] Executing agent: ${agentId}`);

    // Tag conversations with AESOP execution ID for debugging/traceability
    const conversationTag = this.config.executionId
      ? `aesop-${agentId}-${this.config.executionId}`
      : undefined;

    // Wrap the entire agent invocation — Agent Builder dispatch + the
    // stream consumption — in a single OTLP span so tool-call latency,
    // LLM time-to-first-token, and message-complete arrival are all
    // attributable to one parent in APM. Token usage isn't surfaced by
    // the Agent Builder event stream today, so we stamp request/response
    // sizing instead; richer attributes can land here once the agent
    // dispatch contract exposes usage.
    return withAesopSpan(
      `aesop.agent.invoke.${agentId}`,
      {
        attributes: {
          'aesop.kind': 'agent_invocation',
          'aesop.agent_id': agentId,
          'aesop.connector_id': connectorId,
          'aesop.execution_id': this.config.executionId ?? '',
          'aesop.message_length': message.length,
        },
      },
      async () => {
        const { executionId, events$ } = await agentBuilderStart.execution.executeAgent({
          request,
          params: {
            agentId,
            connectorId,
            storeConversation: !!conversationTag,
            conversationId: conversationTag,
            autoCreateConversationWithId: !!conversationTag,
            nextInput: { message },
          },
          metadata: {
            source: 'aesop',
            aesop_execution_id: this.config.executionId || '',
            agent_role: agentId,
          },
        });

        const activeSpan = trace.getActiveSpan();
        if (activeSpan?.isRecording()) {
          activeSpan.setAttribute('aesop.agent.builder_execution_id', String(executionId ?? ''));
        }

        logger.debug(`[AESOP] Agent ${agentId} execution started: ${executionId}`);

        try {
          // Agent Builder emits ChatEventType.messageComplete (`'message_complete'`)
          // with `data.message_content`. Earlier code used wrong string literals
          // (`'messageComplete'`, `'conversationUpdate'`) and a non-existent
          // `event.message.content` shape, which caused every AESOP agent
          // execution to terminate with `EmptyError: no elements in sequence`.
          // `events$` is typed as `any` at the plugin boundary
          // (see AgentOrchestrationConfig docstring). The pipe operators below
          // are still strictly typed against `ChatEvent`, giving us material
          // safety; we just have to pin `lastValueFrom` to `Promise<string>`
          // because the loose source widens the chained inference.
          const response: string = await lastValueFrom<string>(
            events$.pipe(
              filter((event: ChatEvent) => event.type === ChatEventType.messageComplete),
              // `isMessageCompleteEvent` narrows to MessageCompleteEvent, after
              // which `event.data.message_content` is typed as string.
              map((event: ChatEvent) =>
                isMessageCompleteEvent(event) ? event.data.message_content || '' : ''
              ),
              filter((text: string) => text.length > 0),
              timeout(this.timeoutMs),
              catchError((err: unknown) => {
                logger.error(
                  `[AESOP] Agent ${agentId} stream error: ${
                    err instanceof Error ? err.message : String(err)
                  }`
                );
                return of('');
              }),
              // Stream may complete with no message_complete events at all (e.g.
              // tool-only round, error before LLM responded). Default to ''
              // instead of throwing EmptyError so the orchestrator can degrade
              // gracefully and the next agent in the pipeline can still run.
              defaultIfEmpty('')
            )
          );

          if (activeSpan?.isRecording()) {
            activeSpan.setAttribute('aesop.agent.response_length', response.length);
          }

          if (response.length === 0) {
            logger.warn(
              `[AESOP] Agent ${agentId} completed with no message content (execution_id=${executionId}); returning empty response`
            );
          } else {
            logger.info(`[AESOP] Agent ${agentId} completed (${response.length} chars)`);
          }
          return response;
        } catch (error) {
          logger.error(
            `[AESOP] Agent ${agentId} execution failed: ${
              error instanceof Error ? error.message : String(error)
            } (execution_id=${executionId})`
          );
          return '';
        }
      }
    );
  }

  // Skills are returned as opaque structured records. Callers
  // (`exploration_workflow_executor`, `improve_skill`, `run_skill_validation`)
  // own their own zod / runtime validation; pinning a strict type here
  // would force every caller to also adopt that type, which is tracked as a
  // separate slice of work (see PR B6 in the split plan).

  async runDiscoveryPipeline(context: {
    indexNames: string[];
    analystRole: string;
    conversationContext?: string;
  }): Promise<any[]> {
    const { logger } = this.config;

    const progress = this.config.onProgress || (async () => {});
    const hasIndices = context.indexNames.length > 0;

    let schemaResponse = '';
    let patternResponse = '';

    if (hasIndices) {
      // Phase 1-2: Schema Explorer
      await progress('Schema Discovery', 1, 3, 'Agent exploring index schemas with tools...');
      schemaResponse =
        (await this.executeAgent(
          'aesop.schema-explorer',
          `Explore and profile these indices: ${context.indexNames.join(
            ', '
          )}. Focus on security-relevant data for a ${context.analystRole}.`
        )) || '';

      // Phase 3-4: Pattern Miner
      await progress('Pattern Mining', 2, 3, 'Agent mining patterns with ES|QL queries...');
      patternResponse =
        (await this.executeAgent(
          'aesop.pattern-miner',
          `Find automation-worthy patterns in this data. Schema context:\n${schemaResponse}`
        )) || '';
    }

    // Build combined context for skill generation
    const contextParts: string[] = [];
    if (schemaResponse) contextParts.push(`## Index Schemas\n${schemaResponse}`);
    if (patternResponse) contextParts.push(`## Discovered Patterns\n${patternResponse}`);
    if (context.conversationContext)
      contextParts.push(`## Agent Builder Conversation Analysis\n${context.conversationContext}`);

    if (contextParts.length === 0) {
      logger.warn(
        '[AESOP] No context available for skill generation (no indices, no conversations)'
      );
      return [];
    }

    // Phase 5: Skill Generator
    await progress('Skill Generation', 3, 3, 'Agent generating skills from discovered patterns...');
    const skillResponse = await this.executeAgent(
      'aesop.skill-generator',
      `Generate Agent Builder skills based on the following discovery context. Each skill should be a reusable automation that a security analyst would benefit from.\n\n${contextParts.join(
        '\n\n'
      )}`
    );

    if (!skillResponse) {
      logger.warn('[AESOP] Skill generator returned empty');
      return [];
    }

    return parseSkillsFromResponse(skillResponse, this.config.logger);
  }

  // Validation result shape is owned by `skill_validation_service.ts`, which
  // re-parses this opaque record. See `runDiscoveryPipeline` rationale.

  async validateSkill(skillMarkdown: string): Promise<any> {
    const response = await this.executeAgent(
      'aesop.skill-validator',
      `Evaluate this Agent Builder skill:\n\n${skillMarkdown}`
    );

    if (!response) return null;
    return this.parseJsonFromResponse(response);
  }

  async improveSkill(skillMarkdown: string, feedback: string): Promise<any> {
    const response = await this.executeAgent(
      'aesop.skill-improver',
      `Improve this skill based on the feedback.\n\nCurrent Skill:\n${skillMarkdown}\n\nFeedback:\n${feedback}`
    );

    if (!response) return null;
    return this.parseJsonFromResponse(response);
  }

  private parseJsonFromResponse(response: string): any {
    try {
      let cleaned = response;
      cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, '');
      cleaned = cleaned
        .replace(/```json?\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      if (!cleaned.startsWith('{')) {
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) cleaned = match[0];
      }
      return JSON.parse(cleaned);
    } catch {
      this.config.logger.error('[AESOP] Failed to parse JSON from agent response');
      return null;
    }
  }
}
