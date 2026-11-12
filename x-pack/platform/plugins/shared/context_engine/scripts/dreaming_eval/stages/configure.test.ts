/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiIndexHttpItem } from '../../../common/http_api/ai_indices';
import { answerAgentOf, DEFAULT_ANSWER_AGENT_TOOLS, parseConfig } from '../config';
import { aiIndexBodyOf, answerAgentBodyOf, traceQueryOf } from './configure';

const config = parseConfig(
  `
ai_indices:
  - id: eval-both
    description: Both datasets.
    datasets: [longmemeval_s, longmemeval_v2_enterprise]
    dreaming:
      facts: [{ type: preference }]
`,
  '/repo/eval.yaml',
  '/repo'
);
const [aiIndex] = config.ai_indices;

describe('configure stage', () => {
  it("reads the AI index's traces from the agents its datasets were imported as", () => {
    expect(traceQueryOf(config, aiIndex)).toBe(
      'FROM traces-agent_builder.otel-default | WHERE attributes.gen_ai.agent.id IN ("longmemeval-assistant", "workarena-agent")'
    );
  });

  it('gives the answer agent only the AI index, its tools, and instructions to search it', () => {
    const agent = answerAgentOf(aiIndex);

    expect(agent.id).toBe('eval-both-answerer');
    expect(agent.instructions).toContain(
      'Everything you know from past conversations is stored in the AI Index `eval-both` (ES|QL target `ai-index-idx-eval-both`): Both datasets.'
    );
    expect(agent.instructions).toContain(
      'The answer to every question you are asked is in that AI Index.'
    );
    expect(answerAgentBodyOf(aiIndex.id, agent)).toEqual({
      name: 'eval-both answerer',
      description: agent.description,
      configuration: {
        instructions: agent.instructions,
        tools: [{ tool_ids: DEFAULT_ANSWER_AGENT_TOOLS }],
        ai_indices: ['eval-both'],
      },
    });
    expect(
      answerAgentOf({
        ...aiIndex,
        answer_agent: { enabled: true, id: 'mine', instructions: 'Search.', tools: ['x'] },
      })
    ).toEqual(expect.objectContaining({ id: 'mine', instructions: 'Search.', tools: ['x'] }));
  });

  it('writes the dest, the trace source and dreaming, and keeps what the AI index already has', () => {
    const existing = {
      sources: [{ type: 'esql', value: 'FROM logs' }],
      automations: [{ type: 'workflow', value: 'system-context-engine-dreaming-eval-both-0123' }],
      feedback_analysis: { enabled: false },
    } as unknown as AiIndexHttpItem;

    expect(aiIndexBodyOf(config, aiIndex, existing)).toEqual({
      description: 'Both datasets.',
      dest: { type: 'index', value: 'ai-index-idx-eval-both' },
      sources: existing.sources,
      automations: existing.automations,
      traces: [{ type: 'esql', value: traceQueryOf(config, aiIndex) }],
      dreaming: { enabled: true, schedule: { interval: '7d' }, facts: [{ type: 'preference' }] },
      feedback_analysis: { enabled: false },
    });
    expect(aiIndexBodyOf(config, aiIndex, undefined)).toEqual(
      expect.objectContaining({ sources: [], automations: [] })
    );
  });
});
