/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { filter, firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { z } from '@kbn/zod/v4';
import {
  ToolType,
  isRoundCompleteEvent,
  internalTools,
  SELF_AGENT_ID,
  SubagentExecutionMode,
  SubagentMode,
} from '@kbn/agent-builder-common';
import { EffortLevels, type EffortLevel } from '@kbn/agent-builder-common/model_provider';
import type { ChatEvent, AssistantResponse } from '@kbn/agent-builder-common';
import type { InternalBuiltinToolDefinition, SubAgentExecutor } from '@kbn/agent-builder-server';
import { createErrorResult, createOtherResult } from '@kbn/agent-builder-server';
import type { ResolvedSubagent } from '../../../agents/utils/resolve_allowed_subagents';
import type { BackgroundExecutionService } from '../background_execution_service';
import type { SubagentTracker } from '../subagent_tracker';

export const SubAgentToolName = internalTools.runSubagent;

const BASE_TOOL_DESCRIPTION = `Start a sub-agent to perform a specific task.

Delegate a complex sub-task to another agent execution. Pick the target from \`agent_id\`; each option corresponds to a peer agent you're allowed to invoke.

The effort level will be used to select the model - "low" means a faster and smaller model, "high" means a slower and more powerful model. Choose accordingly.

## Writing the prompt

Brief the agent like a smart colleague who just walked into the room — it hasn't seen this conversation, doesn't know what you've tried, doesn't understand why this task matters.
- Explain what you're trying to accomplish and why.
- Describe what you've already learned or ruled out.
- Give enough context about the surrounding problem that the agent can make judgment calls rather than just following a narrow instruction.
- If you need a short response, say so ("report in under 200 words").
- Lookups: hand over the exact command. Investigations: hand over the question — prescribed steps become dead weight when the premise is wrong.

## Usage notes

- When the agent is done, it will return a single message back to you. The result returned by the agent is not visible to the user. To show the user the result, you should send a text message back to the user with a concise summary of the result.

- The agent's outputs should generally be trusted

- If the user specifies that they want you to run agents "in parallel", you MUST send a single message with multiple ${SubAgentToolName} tool use content blocks. For example, if you need to launch both a build-validator agent and a test-runner agent in parallel, send a single message with both tool calls.

- **Foreground vs background**:
  - Use foreground (default) when you need the agent's results before you can proceed — e.g., research agents whose findings inform your next steps.
  - Use background when you have genuinely independent work to do in parallel.

## Persistent sub-agents

- \`mode: "persistent"\` creates a named, long-running sub-agent you can address later with the \`send_message\` tool. Only use "persistent" when you expect to follow up with the same sub-agent across multiple invocations (either later in this round or in a future round).
- Pick a short, meaningful \`name\` that reflects the sub-agent's role (e.g. \`researcher\`, \`code-reviewer\`, \`planner\`). Names are scoped to the current conversation.
- \`run_subagent\` only ever creates. If a persistent sub-agent with the same name already exists, this call will fail — use \`send_message\` to talk to it.
- The current active roster is surfaced to you in "Active persistent sub-agents" system notices; check there before choosing a name.

## Running agents in the background

- When an agent runs in the background, **you** will be **automatically** notified when it completes via a system notification
  - Do not try to proactively check on its progress. Continue with other work or respond to the user instead.
  - Assume that the execution isn't completed until you see a notification about it.
  - In particular, do **not** use the platform.core.get_workflow_execution_status tool to check the status.
  - Users will **not** be automatically notified when the execution complete. You have to inform them about it.
`;

/**
 * Orders the allowlist so that `_self` (when present) sits first — makes the
 * self-fork option easy to spot in the tool schema description.
 */
const orderAllowedWithSelfFirst = (list: ResolvedSubagent[]): ResolvedSubagent[] => {
  const self = list.find((r) => r.id === SELF_AGENT_ID);
  const rest = list.filter((r) => r.id !== SELF_AGENT_ID);
  return self ? [self, ...rest] : rest;
};

/** Builds the tool description with the per-id allowlist enumeration on top. */
const buildToolDescription = (allowed: ResolvedSubagent[]): string => {
  const lines = allowed.map((a) => `- ${a.id}: ${a.description}`).join('\n');
  return `${BASE_TOOL_DESCRIPTION}\nAvailable sub-agents:\n${lines}\n`;
};

export const createSubagentTool = ({
  ownerAgentId,
  allowedSubagents,
  executionId: parentExecutionId,
  connectorId,
  subAgentExecutor,
  abortSignal,
  backgroundExecutionService,
  parentConversationId,
  subagentTracker,
  conversationExists,
}: {
  /**
   * Id of the agent currently executing (the "owner") — used to resolve the
   * `_self` sentinel to a real id at the executor call seam.
   */
  ownerAgentId: string;
  /**
   * Resolved, access-filtered allowlist. Non-empty (empty case is filtered by
   * the registrar before this factory is invoked). Each entry's `id` is either
   * a real agent id or the `SELF_AGENT_ID` sentinel.
   */
  allowedSubagents: ResolvedSubagent[];
  executionId: string;
  connectorId?: string;
  subAgentExecutor: SubAgentExecutor;
  abortSignal?: AbortSignal;
  backgroundExecutionService?: BackgroundExecutionService;
  /** Parent conversation id — required for persistent-mode creation. */
  parentConversationId?: string;
  /** Round-local persistent sub-agent tracker. */
  subagentTracker?: SubagentTracker;
  /** Existence probe for stale-entry recovery. */
  conversationExists?: (id: string) => Promise<boolean>;
}) => {
  const orderedAllowed = orderAllowedWithSelfFirst(allowedSubagents);
  const allowedIds = orderedAllowed.map((a) => a.id) as [string, ...string[]];
  const allowedIdsSet = new Set(allowedIds);

  const schema = z.object({
    agent_id: z
      .enum(allowedIds)
      .describe(
        'Id of the sub-agent to delegate to. Must be one of the ids listed in the tool description.'
      ),
    description: z.string().describe('A short (3-5 word) description of the task'),
    prompt: z.string().describe('The task for the agent to perform'),
    mode: z
      .enum([SubagentMode.transient, SubagentMode.persistent])
      .optional()
      .describe(
        '"transient" (default) to create a one-off sub-agent or "persistent" to create a named session you can address later via send_message.'
      ),
    name: z
      .string()
      .optional()
      .describe(
        'For persistent agents - unique Identifier for the sub-agent. Defaults to "subagent".'
      ),
    run_in_background: z
      .boolean()
      .optional()
      .describe(
        'Set to true to run this agent in the background. You will be notified when it completes.'
      ),
    effort: z
      .enum([EffortLevels.low, EffortLevels.medium, EffortLevels.high])
      .optional()
      .describe('The effort level of the task.'),
  });

  const tool: InternalBuiltinToolDefinition<typeof schema> = {
    id: SubAgentToolName,
    description: buildToolDescription(orderedAllowed),
    type: ToolType.builtin,
    schema,
    tags: ['subagent'],
    handler: async (
      { agent_id, description, prompt, run_in_background = false, effort = 'medium', mode, name },
      { events, modelProvider }
    ) => {
      // Defense-in-depth: reject an off-enum agent_id even though Zod should
      // already have filtered it. Compare by sentinel-shaped string so
      // `_self` matches `_self` and real ids match real ids.
      if (!allowedIdsSet.has(agent_id)) {
        return {
          results: [createErrorResult(`Agent id "${agent_id}" is not in this agent's allowlist.`)],
        };
      }

      // Sentinel substitution happens at exactly this seam: the tracker,
      // events, and prompt all continue to speak in sentinel terms; only the
      // executor sees the real id.
      const resolvedAgentId = agent_id === SELF_AGENT_ID ? ownerAgentId : agent_id;

      const fullPrompt = `${description}\n\n${prompt}`;
      const isPersistent = mode === SubagentMode.persistent;

      try {
        const subAgentModel = await modelProvider.selectModel({
          effortLevel: effort as EffortLevel,
        });
        const selectedConnectorId = subAgentModel.connector.connectorId;
        if (isPersistent) {
          const finalName = name ?? 'subagent';

          if (!subagentTracker || !parentConversationId) {
            return {
              results: [
                createErrorResult(
                  'Persistent sub-agent creation is not available in this execution context.'
                ),
              ],
            };
          }

          // Uniqueness check: name must not point to a live child.
          const existing = subagentTracker.get(finalName);
          if (existing) {
            const stillExists = conversationExists
              ? await conversationExists(existing.conversation_id)
              : true;
            if (stillExists) {
              return {
                results: [
                  createErrorResult(
                    `A sub-agent named "${finalName}" already exists in this conversation. ` +
                      `Use send_message({ to: "${finalName}", ... }) to talk to it, or pick a ` +
                      `different name to create a new one.`
                  ),
                ],
              };
            }
            // Stale entry — drop and fall through to creation.
            subagentTracker.clear(finalName);
          }

          // Creation path.
          const newChildId = uuidv4();

          const { executionId, events$ } = await subAgentExecutor.createSubAgent({
            agentId: resolvedAgentId,
            parentConversationId,
            parentExecutionId,
            subagentName: finalName,
            subagentPurpose: description,
            conversationId: newChildId,
            prompt: fullPrompt,
            connectorId: selectedConnectorId,
            ...(run_in_background ? {} : { abortSignal }),
          });

          // Store the entry with the sentinel-shaped agent_id (not the
          // resolved real id) so the reachability check in send_message
          // matches whichever form the parent's allowlist holds.
          subagentTracker.register({
            name: finalName,
            purpose: description,
            conversation_id: newChildId,
            agent_id,
          });

          events.reportProgress(`Sub-agent execution ${executionId} started`, {
            metadata: { agent_execution_id: executionId, internal: 'true' },
          });

          if (run_in_background) {
            backgroundExecutionService?.registerExecution(executionId);
            return {
              results: [
                createOtherResult({
                  agent_execution_id: executionId,
                  mode: SubagentExecutionMode.background,
                  status: 'queued',
                }),
              ],
            };
          }

          const response = await extractFinalResponse(events$);
          return {
            results: [
              createOtherResult({
                agent_execution_id: executionId,
                mode: SubagentExecutionMode.foreground,
                status: 'completed',
                response,
              }),
            ],
          };
        }

        // Transient path.
        const { executionId, events$ } = await subAgentExecutor.executeSubAgent({
          agentId: resolvedAgentId,
          connectorId: selectedConnectorId,
          parentExecutionId,
          prompt: fullPrompt,
          // background agents should continue running even if main execution completes
          ...(run_in_background ? {} : { abortSignal }),
        });

        events.reportProgress(`Sub-agent execution ${executionId} started`, {
          metadata: {
            agent_execution_id: executionId,
            internal: 'true',
          },
        });

        if (run_in_background) {
          backgroundExecutionService?.registerExecution(executionId);

          return {
            results: [
              createOtherResult({
                agent_execution_id: executionId,
                mode: SubagentExecutionMode.background,
                status: 'queued',
              }),
            ],
          };
        }

        const response = await extractFinalResponse(events$);

        return {
          results: [
            createOtherResult({
              agent_execution_id: executionId,
              mode: SubagentExecutionMode.foreground,
              status: 'completed',
              response,
            }),
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          results: [createErrorResult(`Sub-agent execution failed: ${message}`)],
        };
      }
    },
  };

  return tool;
};

/**
 * Subscribe to the events observable and extract the final response text
 * from the RoundComplete event.
 */
const extractFinalResponse = async (events$: Observable<ChatEvent>): Promise<AssistantResponse> => {
  const roundComplete = await firstValueFrom(events$.pipe(filter(isRoundCompleteEvent)), {
    defaultValue: undefined,
  });

  if (!roundComplete) {
    throw new Error('Sub-agent execution completed without a round complete event');
  }

  return roundComplete.data.round.response;
};
