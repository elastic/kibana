/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiIndexHttpItem, CreateAiIndexRequest } from '../../../common/http_api/ai_indices';
import { PUBLIC_API_PATH } from '../../../common/constants';
import type { AiIndexEvalConfig, AnswerAgent, EvalConfig } from '../config';
import { answerAgentOf, destOf, resolveDreaming } from '../config';
import type { StageContext } from '../context';

const CONTEXT_ENGINE_ENABLED = 'contextEngine:enabled';
const MEMORY_ENABLED = 'contextEngine:memoryEnabled';

export const aiIndexPath = (aiIndexId: string): string =>
  `${PUBLIC_API_PATH}/ai_index/${encodeURIComponent(aiIndexId)}`;

/** The ES|QL trace source of an AI index: the spans of the agents its datasets were imported as. */
export const traceQueryOf = (config: EvalConfig, aiIndex: AiIndexEvalConfig): string => {
  const agentIds = aiIndex.datasets.map((dataset) => config.datasets[dataset].agent.id);
  return `FROM ${config.tracesIndex} | WHERE attributes.gen_ai.agent.id IN (${agentIds
    .map((id) => JSON.stringify(id))
    .join(', ')})`;
};

export const aiIndexBodyOf = (
  config: EvalConfig,
  aiIndex: AiIndexEvalConfig,
  existing: AiIndexHttpItem | undefined
): Omit<CreateAiIndexRequest, 'id'> => ({
  description: aiIndex.description,
  dest: { type: 'index', value: destOf(aiIndex.id) },
  sources: existing?.sources ?? [],
  automations: existing?.automations ?? [],
  traces: [{ type: 'esql', value: traceQueryOf(config, aiIndex) }],
  dreaming: resolveDreaming(aiIndex.dreaming, config.schedule_interval),
  ...(existing?.feedback_analysis && { feedback_analysis: existing.feedback_analysis }),
});

export const getAiIndex = async (
  context: StageContext,
  aiIndexId: string
): Promise<AiIndexHttpItem | undefined> => {
  const { status, data } = await context.kibana<AiIndexHttpItem>(
    'GET',
    aiIndexPath(aiIndexId),
    undefined,
    { allowStatuses: [404] }
  );
  return status === 404 ? undefined : data;
};

export const runConfigure = async (context: StageContext): Promise<void> => {
  const { config, kibana, log } = context;
  await kibana('POST', '/internal/kibana/settings', {
    changes: { [CONTEXT_ENGINE_ENABLED]: true },
  });
  await kibana('POST', '/internal/kibana/global_settings', { changes: { [MEMORY_ENABLED]: true } });
  log.info(`Turned on ${CONTEXT_ENGINE_ENABLED} in space '${config.space}' and ${MEMORY_ENABLED}`);

  for (const aiIndex of config.ai_indices.filter(({ id }) => context.aiIndexIds.includes(id))) {
    const existing = await getAiIndex(context, aiIndex.id);
    await kibana('PUT', aiIndexPath(aiIndex.id), aiIndexBodyOf(config, aiIndex, existing), {
      timeoutMs: 120_000,
    });
    const stored = await getAiIndex(context, aiIndex.id);
    const workflows = (stored?.automations ?? []).map(({ value }) => value);
    log.success(
      `${existing ? 'Updated' : 'Created'} AI index '${aiIndex.id}' (${destOf(
        aiIndex.id
      )}), dreaming over ${aiIndex.datasets.join(', ')}; workflows: ${
        workflows.join(', ') || 'none'
      }`
    );

    if (aiIndex.answer_agent.enabled) {
      const agent = answerAgentOf(aiIndex);
      const created = await upsertAnswerAgent(context, aiIndex.id, agent);
      log.success(
        `${created ? 'Created' : 'Updated'} agent '${agent.id}' with AI index '${
          aiIndex.id
        }' and tools ${agent.tools.join(', ')}`
      );
    }
  }
};

const AGENTS_PATH = '/api/agent_builder/agents';

export const answerAgentBodyOf = (aiIndexId: string, agent: AnswerAgent) => ({
  name: agent.name,
  description: agent.description,
  configuration: {
    instructions: agent.instructions,
    tools: [{ tool_ids: agent.tools }],
    ai_indices: [aiIndexId],
  },
});

/** Creates the answer agent, or updates it to the config; true when it was created. */
const upsertAnswerAgent = async (
  context: StageContext,
  aiIndexId: string,
  agent: AnswerAgent
): Promise<boolean> => {
  const path = `${AGENTS_PATH}/${encodeURIComponent(agent.id)}`;
  const { status } = await context.kibana('GET', path, undefined, { allowStatuses: [404] });
  const body = answerAgentBodyOf(aiIndexId, agent);
  if (status === 404) {
    await context.kibana('POST', AGENTS_PATH, { id: agent.id, ...body });
    return true;
  }
  await context.kibana('PUT', path, body);
  return false;
};
