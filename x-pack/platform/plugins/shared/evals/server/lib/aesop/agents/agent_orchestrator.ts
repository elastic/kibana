/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { lastValueFrom, timeout, catchError, filter, map, of } from 'rxjs';

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
    this.timeoutMs = config.timeoutMs || 120_000;
  }

  async executeAgent(agentId: string, message: string): Promise<string> {
    const { agentBuilderStart, request, connectorId, logger } = this.config;

    logger.info(`[AESOP] Executing agent: ${agentId}`);

    // Tag conversations with AESOP execution ID for debugging/traceability
    const conversationTag = this.config.executionId
      ? `aesop-${agentId}-${this.config.executionId}`
      : undefined;

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

    logger.debug(`[AESOP] Agent ${agentId} execution started: ${executionId}`);

    try {
      const response = (await lastValueFrom(
        events$.pipe(
          filter(
            (event: any) => event.type === 'messageComplete' || event.type === 'conversationUpdate'
          ),
          map((event: any) => {
            if (event.type === 'messageComplete' && event.message?.content) {
              return event.message.content;
            }
            if (event.type === 'conversationUpdate') {
              const messages = event.conversation?.messages || [];
              const lastAssistant = messages.filter((m: any) => m.role === 'assistant').pop();
              return lastAssistant?.content || '';
            }
            return '';
          }),
          filter((text: string) => text.length > 0),
          timeout(this.timeoutMs),
          catchError((err) => {
            logger.error(
              `[AESOP] Agent ${agentId} stream error: ${
                err instanceof Error ? err.message : String(err)
              }`
            );
            return of('');
          })
        )
      )) as string;

      logger.info(`[AESOP] Agent ${agentId} completed (${response.length} chars)`);
      return response;
    } catch (error) {
      // lastValueFrom throws EmptyError when observable completes without emitting
      logger.error(
        `[AESOP] Agent ${agentId} execution failed: ${
          error instanceof Error ? error.message : String(error)
        } (execution_id=${executionId})`
      );
      return '';
    }
  }

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

    return this.parseSkillsFromResponse(skillResponse);
  }

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

  private parseSkillsFromResponse(response: string): any[] {
    try {
      let cleaned = response;
      cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, '');
      cleaned = cleaned
        .replace(/```json?\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      const match = cleaned.match(/\[[\s\S]*\]/);
      return match ? JSON.parse(match[0]) : [];
    } catch {
      this.config.logger.error('[AESOP] Failed to parse skills from agent response');
      return [];
    }
  }

  private parseJsonFromResponse(response: string): any | null {
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
