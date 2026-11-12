/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import {
  DEFAULT_CONFIG_PATH,
  loadConfig,
  parseConfig,
  resolveDreaming,
  selectAiIndexIds,
  withSampleOverrides,
} from './config';

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
    expect(config.run_datasets).toEqual(['longmemeval_s']);
    expect(config.datasets.longmemeval_s).toEqual(
      expect.objectContaining({
        variant: 's',
        samples: [],
        sample_count: 1,
        all_samples: false,
        sessions: 'haystack',
      })
    );
    expect(config.datasets.longmemeval_v2_enterprise).toEqual(
      expect.objectContaining({ haystack: 'small', all_samples: true })
    );
    expect(config.datasets.longmemeval_v2_enterprise.max_trajectories).toBeUndefined();
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

  describe('choosing what to run', () => {
    const config = parseConfig(
      `
ai_indices:
  - { id: chats, datasets: [longmemeval_s], dreaming: { template: personal_assistant } }
  - { id: portal, datasets: [longmemeval_v2_enterprise], dreaming: { facts: [{ type: procedure }] } }
  - { id: both, datasets: [longmemeval_s, longmemeval_v2_enterprise], dreaming: { facts: [{ type: x }] } }
`,
      '/repo/eval.yaml',
      REPO_ROOT
    );

    it('works on the AI indices that dream on only the chosen datasets, or on the listed ones', () => {
      expect(selectAiIndexIds(config, {})).toEqual(['chats']);
      expect(selectAiIndexIds(config, { datasets: ['longmemeval_v2_enterprise'] })).toEqual([
        'portal',
      ]);
      expect(
        selectAiIndexIds(config, { datasets: ['longmemeval_s', 'longmemeval_v2_enterprise'] })
      ).toEqual(['chats', 'portal', 'both']);
      expect(selectAiIndexIds(config, { aiIndexIds: ['both'] })).toEqual(['both']);
      expect(() => selectAiIndexIds(config, { aiIndexIds: ['nope'] })).toThrow(
        'The config has no AI index nope'
      );
    });

    it('overrides the samples of the datasets in use', () => {
      const overridden = withSampleOverrides(config, ['longmemeval_s'], { sampleCount: 3 });

      expect(overridden.datasets.longmemeval_s).toEqual(
        expect.objectContaining({ sample_count: 3, all_samples: false })
      );
      expect(overridden.datasets.longmemeval_v2_enterprise).toBe(
        config.datasets.longmemeval_v2_enterprise
      );
      expect(
        withSampleOverrides(config, ['longmemeval_s'], { allSamples: true }).datasets.longmemeval_s
          .all_samples
      ).toBe(true);
      expect(
        withSampleOverrides(config, ['longmemeval_s'], { samples: ['e47becba'] }).datasets
          .longmemeval_s.samples
      ).toEqual(['e47becba']);
      expect(() =>
        withSampleOverrides(config, ['longmemeval_s', 'longmemeval_v2_enterprise'], {
          samples: ['e47becba'],
        })
      ).toThrow('Sample ids and presets belong to one dataset');
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

  it('ships dev_50 as 50 different questions, the 10 of dev among them', () => {
    const config = loadConfig(DEFAULT_CONFIG_PATH, path.resolve(__dirname, '../../../../../../..'));
    const { dev, dev_50: dev50 } = config.datasets.longmemeval_s.presets;

    expect(new Set(dev50).size).toBe(50);
    expect(dev50).toEqual(expect.arrayContaining(dev));
  });
});
