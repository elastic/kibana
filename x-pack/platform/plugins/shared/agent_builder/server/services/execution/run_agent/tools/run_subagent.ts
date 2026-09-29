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
import { i18n } from '@kbn/i18n';
import { capitalize, uniqBy } from 'lodash';
import {
  ToolType,
  apiTargets,
  isApiAutoApproved,
  isRoundCompleteEvent,
  internalTools,
  SELF_AGENT_ID,
  SubagentExecutionMode,
  SubagentMode,
  toAutoApprovedApis,
} from '@kbn/agent-builder-common';
import { EffortLevels, type EffortLevel } from '@kbn/agent-builder-common/model_provider';
import { findUnknownApis, formatUnknownApis } from '@kbn/agent-builder-common/apis/known_apis';
import { ConfirmationStatus } from '@kbn/agent-builder-common/agents/prompts';
import type {
  ApiTarget,
  AssistantResponse,
  AutoApprovedApi,
  ChatEvent,
  InteractivityConfig,
} from '@kbn/agent-builder-common';
import type {
  InternalBuiltinToolDefinition,
  SubAgentExecutor,
  ToolPromptManager,
} from '@kbn/agent-builder-server';
import { createErrorResult, createOtherResult } from '@kbn/agent-builder-server';
import type { ToolHandlerPromptReturn, ToolHandlerReturn } from '@kbn/agent-builder-server/tools';
import { partitionDestructiveApis } from '../api';
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

## Destructive API access

A sub-agent has no user of its own to confirm anything, so every destructive \`${internalTools.executeApi}\` call it attempts is refused unless you grant it here.

- Only pass \`auto_approved_apis\` when the task you are delegating genuinely has to mutate state. A read-only task needs no grant, and a read-only API is dropped from one: the sub-agent can already call it.
- Each entry is an exact identifier (\`indices.create\`), a namespace wildcard (\`indices.*\`), or \`*\` for every API on that backend. Grant the narrowest set that lets the task finish: \`indices.*\` includes \`indices.delete\`, and \`*\` lets the sub-agent perform any destructive operation the user could, unattended.
- The user is asked once, for the whole grant, before the sub-agent starts. If they deny it, the sub-agent still runs but without destructive access — report that back rather than re-requesting the same grant.
- The grant covers only this delegation. A later \`${internalTools.sendMessageToAgent}\` to a persistent sub-agent does not inherit it.
`;

/**
 * Orders the allowlist so that `_self` (when present) sits first
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

/**
 * How the requested destructive API grant was settled, reported back to the delegating agent.
 *
 * - `granted`: the sub-agent runs with the requested APIs pre-approved.
 * - `denied`: the user refused, and the sub-agent runs without them.
 * - `unavailable`: nobody could be asked, so the sub-agent runs without them.
 * - `not_required`: nothing requested could change state, so there was nothing to approve.
 */
type SubagentDestructiveAccess = 'granted' | 'denied' | 'unavailable' | 'not_required';

interface SubagentGrantReport {
  destructive_access?: SubagentDestructiveAccess;
  non_destructive_apis?: AutoApprovedApi[];
}

type SubagentApiGrant =
  | {
      status: SubagentDestructiveAccess;
      autoApprovedApis?: AutoApprovedApi[];
      nonDestructiveApis?: AutoApprovedApi[];
    }
  | { status: 'unknown_apis'; message: string }
  | { status: 'prompted'; promptReturn: ToolHandlerPromptReturn };

type SettledApiGrant =
  | { handlerReturn: ToolHandlerReturn }
  | {
      autoApprovedApis?: AutoApprovedApi[];
      grantReport: SubagentGrantReport;
    };

const requestedApisSchema = ({
  target,
  exampleApi,
  exampleNamespace,
}: {
  target: ApiTarget;
  exampleApi: string;
  exampleNamespace: string;
}) =>
  z
    .array(z.string().max(200))
    .max(100)
    .optional()
    .describe(
      `${capitalize(target)} APIs to request. Each entry is an exact identifier (e.g. ` +
        `"${exampleApi}"), a namespace wildcard (e.g. "${exampleNamespace}.*"), or "*" ` +
        `for every ${capitalize(target)} API.`
    );

const formatGrantedApis = (apis: readonly AutoApprovedApi[]): string =>
  apiTargets
    .map((target) => ({
      target,
      granted: apis.filter((entry) => entry.target === target),
    }))
    .filter(({ granted }) => granted.length > 0)
    .map(
      ({ target, granted }) =>
        `- ${capitalize(target)}: ${granted.map(({ api }) => `\`${api}\``).join(', ')}`
    )
    .join('\n');

const resolveSubagentApiGrant = async ({
  requested,
  interactivity,
  prompts,
  promptId,
  agentId,
}: {
  requested: AutoApprovedApi[];
  interactivity: InteractivityConfig;
  prompts: ToolPromptManager;
  promptId: string;
  agentId: string;
}): Promise<SubagentApiGrant> => {
  const unknownApis = findUnknownApis(requested);
  if (unknownApis.length > 0) {
    return {
      status: 'unknown_apis',
      message:
        `Unknown auto_approved_apis: ${formatUnknownApis(unknownApis)}. Each entry must name an ` +
        `API that exists on its target. Use the ${internalTools.discoverApis} tool to find the identifier.`,
    };
  }

  const { destructive, nonDestructive } = await partitionDestructiveApis(requested);
  const settled = (
    grantStatus: SubagentDestructiveAccess,
    autoApprovedApis?: AutoApprovedApi[]
  ): SubagentApiGrant => ({
    status: grantStatus,
    ...(autoApprovedApis ? { autoApprovedApis } : {}),
    ...(nonDestructive.length > 0 ? { nonDestructiveApis: nonDestructive } : {}),
  });

  if (destructive.length === 0) {
    return settled('not_required');
  }

  const pending = destructive.filter(
    ({ target, api }) => !isApiAutoApproved({ interactivity, target, api })
  );
  if (pending.length === 0) {
    return settled('granted');
  }

  if (!interactivity.enabled) {
    return settled('unavailable');
  }

  const { status } = prompts.checkConfirmationStatus(promptId);

  if (status === ConfirmationStatus.rejected) {
    return settled('denied');
  }

  if (status === ConfirmationStatus.unprompted) {
    const intro = i18n.translate(
      'xpack.agentBuilder.tools.runSubagent.destructiveApis.confirmation.message',
      {
        defaultMessage:
          'The agent is attempting to delegate a task that can modify or delete existing data to `{agentId}`. Approving allows the sub-agent to call these APIs.',
        values: { agentId },
      }
    );
    const denyExplanation = i18n.translate(
      'xpack.agentBuilder.tools.runSubagent.destructiveApis.confirmation.denyExplanation',
      {
        defaultMessage: 'If you deny, `{agentId}` runs without access to these APIs.',
        values: { agentId },
      }
    );

    return {
      status: 'prompted',
      promptReturn: prompts.askForConfirmation({
        id: promptId,
        title: i18n.translate(
          'xpack.agentBuilder.tools.runSubagent.destructiveApis.confirmation.title',
          {
            defaultMessage: 'Allow `{agentId}` to modify your data?',
            values: { agentId },
          }
        ),
        message: `${intro}\n\n${formatGrantedApis(pending)}\n\n${denyExplanation}`,
        confirm_text: i18n.translate(
          'xpack.agentBuilder.tools.runSubagent.destructiveApis.confirmation.confirmText',
          { defaultMessage: 'Approve' }
        ),
        cancel_text: i18n.translate(
          'xpack.agentBuilder.tools.runSubagent.destructiveApis.confirmation.cancelText',
          { defaultMessage: 'Deny' }
        ),
      }),
    };
  }

  return settled('granted', pending);
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
  /** Id of the agent currently executing (the "owner") */
  ownerAgentId: string;
  /** Resolved, access-filtered allowlist of subagents. */
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
    auto_approved_apis: z
      .strictObject({
        elasticsearch: requestedApisSchema({
          target: 'elasticsearch',
          exampleApi: 'indices.create',
          exampleNamespace: 'indices',
        }),
        kibana: requestedApisSchema({
          target: 'kibana',
          exampleApi: 'alerting.delete-alerting-rule-id',
          exampleNamespace: 'alerting',
        }),
      })
      .optional()
      .describe(
        'Destructive APIs to request for the sub-agent, keyed by backend. Only pass this when the ' +
          'delegated task has to mutate state. The user is asked once to approve the whole grant.'
      ),
  });

  const tool: InternalBuiltinToolDefinition<typeof schema> = {
    id: SubAgentToolName,
    description: buildToolDescription(orderedAllowed),
    type: ToolType.builtin,
    schema,
    tags: ['subagent'],
    handler: async (
      {
        agent_id,
        description,
        prompt,
        run_in_background = false,
        effort = 'medium',
        mode,
        name,
        auto_approved_apis: autoApprovedApisByTarget,
      },
      { events, modelProvider, prompts, interactivity, callContext }
    ) => {
      // Defense-in-depth: reject an off-enum agent_id even though Zod should already have filtered it.
      if (!allowedIdsSet.has(agent_id)) {
        return {
          results: [createErrorResult(`Agent id "${agent_id}" is not in this agent's allowlist.`)],
        };
      }

      // Sentinel substitution happens at exactly this seam - only the executor sees the real id.
      const resolvedAgentId = agent_id === SELF_AGENT_ID ? ownerAgentId : agent_id;
      // `_self` means nothing to a user, so anything user-facing names the agent behind it.
      const subagentLabel = resolvedAgentId || 'sub-agent';

      const fullPrompt = `${description}\n\n${prompt}`;
      const isPersistent = mode === SubagentMode.persistent;

      const requestedApis = uniqBy(
        toAutoApprovedApis(autoApprovedApisByTarget ?? {}),
        ({ target, api }) => `${target}:${api}`
      );

      const settleApiGrant = async (): Promise<SettledApiGrant> => {
        if (requestedApis.length === 0) {
          return { grantReport: {} };
        }

        const grant = await resolveSubagentApiGrant({
          requested: requestedApis,
          interactivity,
          prompts,
          promptId: `${SubAgentToolName}.${callContext.toolCallId}.auto_approved_apis`,
          agentId: subagentLabel,
        });

        if (grant.status === 'unknown_apis') {
          return { handlerReturn: { results: [createErrorResult(grant.message)] } };
        }
        if (grant.status === 'prompted') {
          return { handlerReturn: grant.promptReturn };
        }

        return {
          ...(grant.status === 'granted' && grant.autoApprovedApis
            ? { autoApprovedApis: grant.autoApprovedApis }
            : {}),
          grantReport: {
            destructive_access: grant.status,
            ...(grant.nonDestructiveApis ? { non_destructive_apis: grant.nonDestructiveApis } : {}),
          },
        };
      };

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

          const apiGrant = await settleApiGrant();
          if ('handlerReturn' in apiGrant) {
            return apiGrant.handlerReturn;
          }
          const { autoApprovedApis, grantReport } = apiGrant;

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
            ...(autoApprovedApis ? { autoApprovedApis } : {}),
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
                  ...grantReport,
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
                ...grantReport,
              }),
            ],
          };
        }

        const apiGrant = await settleApiGrant();
        if ('handlerReturn' in apiGrant) {
          return apiGrant.handlerReturn;
        }
        const { autoApprovedApis, grantReport } = apiGrant;

        // Transient path.
        const { executionId, events$ } = await subAgentExecutor.executeSubAgent({
          agentId: resolvedAgentId,
          connectorId: selectedConnectorId,
          parentExecutionId,
          prompt: fullPrompt,
          ...(autoApprovedApis ? { autoApprovedApis } : {}),
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
                ...grantReport,
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
              ...grantReport,
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
