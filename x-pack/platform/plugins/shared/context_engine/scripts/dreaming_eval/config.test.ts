/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { DEFAULT_CONFIG_PATH, loadConfig, parseConfig, resolveDreaming } from './config';

const REPO_ROOT = '/repo';

const minimal = `
ai_indices:
  - id: eval-a
    datasets: [longmemeval_s]
    dreaming:
      facts: [{ type: preference }]
`;

describe('dreaming eval config', () => {
  it('fills in defaults and resolves paths against the repo root', () => {
    const config = parseConfig(minimal, '/repo/configs/eval.yaml', REPO_ROOT);

    expect(config.dataDir).toBe('/repo/data/context_engine_dreaming_eval');
    expect(config.configDir).toBe('/repo/configs');
    expect(config.tracesIndex).toBe('traces-agent_builder.otel-default');
    expect(config.datasets.longmemeval_s).toEqual(
      expect.objectContaining({ questions_per_type: 1, distractor_sessions: 1 })
    );
    expect(config.datasets.longmemeval_v2_enterprise).toEqual(
      expect.objectContaining({ haystack: 'small', trajectories: 100 })
    );
    expect(config.ai_indices[0].targets).toEqual([]);
    expect(config.evaluate.rerank_inference_id).toBe('.rerank-v1-elasticsearch');
  });

  it('writes traces to the space of the config', () => {
    expect(parseConfig(`space: team-a\n${minimal}`, '/repo/eval.yaml', REPO_ROOT).tracesIndex).toBe(
      'traces-agent_builder.otel-team-a'
    );
  });

  it('rejects an AI index listed twice, an unknown dataset, and dreaming with nothing to build', () => {
    const twice = `${minimal}  - id: eval-a\n    datasets: [longmemeval_s]\n    dreaming: { template: personal_assistant }\n`;
    expect(() => parseConfig(twice, '/repo/eval.yaml', REPO_ROOT)).toThrow(
      "AI index 'eval-a' is listed twice"
    );
    expect(() =>
      parseConfig(minimal.replace('longmemeval_s', 'locomo'), '/repo/eval.yaml', REPO_ROOT)
    ).toThrow('Invalid config /repo/eval.yaml');
    expect(() =>
      parseConfig(
        'ai_indices: [{ id: eval-a, datasets: [longmemeval_s], dreaming: {} }]',
        '/repo/eval.yaml',
        REPO_ROOT
      )
    ).toThrow('dreaming needs a template, facts or entities');
  });

  it('turns dreaming on from a template, with what the config sets on top', () => {
    const template = {
      dreaming: {
        instructions: 'From the template.',
        facts: [{ type: 'preference' }],
        entities: { nodes: [{ type: 'person' }] },
      },
    };

    expect(
      resolveDreaming(
        { template: 'personal_assistant', facts: [{ type: 'plan' }] },
        '7d',
        () => template
      )
    ).toEqual({
      enabled: true,
      schedule: { interval: '7d' },
      instructions: 'From the template.',
      facts: [{ type: 'plan' }],
      entities: { nodes: [{ type: 'person' }] },
    });
  });

  it('ships a default config whose templates exist', () => {
    const config = loadConfig(DEFAULT_CONFIG_PATH, path.resolve(__dirname, '../../../../../../..'));

    expect(config.ai_indices.map(({ id }) => id)).toEqual([
      'dreaming-eval-longmemeval',
      'dreaming-eval-workarena',
    ]);
    for (const { dreaming } of config.ai_indices) {
      const resolved = resolveDreaming(dreaming, config.schedule_interval);
      expect(resolved.facts?.length).toBeGreaterThan(0);
      expect(resolved.entities?.nodes.length).toBeGreaterThan(0);
    }
  });
});
