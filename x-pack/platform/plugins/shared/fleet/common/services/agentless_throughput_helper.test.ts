/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackagePolicy } from '../types/models';

import { getAgentlessThroughputIndexPatterns } from './agentless_throughput_helper';

const makePolicy = (
  streams: Array<{ enabled: boolean; type?: string; dataset: string; dynamicDataset?: boolean }>
): Pick<PackagePolicy, 'inputs'> =>
  ({
    inputs: [
      {
        type: 'test-input',
        enabled: true,
        streams: streams.map((s) => ({
          enabled: s.enabled,
          data_stream: {
            type: s.type ?? 'logs',
            dataset: s.dataset,
            ...(s.dynamicDataset !== undefined
              ? { elasticsearch: { dynamic_dataset: s.dynamicDataset } }
              : {}),
          },
        })),
      },
    ],
  } as unknown as Pick<PackagePolicy, 'inputs'>);

describe('getAgentlessThroughputIndexPatterns', () => {
  it('returns empty array when there are no inputs', () => {
    expect(getAgentlessThroughputIndexPatterns({ inputs: [] })).toEqual([]);
  });

  it('returns empty array when all streams are disabled', () => {
    const policy = makePolicy([{ enabled: false, dataset: 'nginx.access' }]);
    expect(getAgentlessThroughputIndexPatterns(policy)).toEqual([]);
  });

  it('uses "logs" as default type when data_stream.type is absent', () => {
    const policy = makePolicy([{ enabled: true, dataset: 'nginx.access' }]);
    expect(getAgentlessThroughputIndexPatterns(policy)).toEqual(['logs-nginx.access-*']);
  });

  it('uses the explicit type when provided', () => {
    const policy = makePolicy([{ enabled: true, type: 'metrics', dataset: 'nginx.status' }]);
    expect(getAgentlessThroughputIndexPatterns(policy)).toEqual(['metrics-nginx.status-*']);
  });

  it('deduplicates patterns from streams with the same type+dataset', () => {
    const policy = makePolicy([
      { enabled: true, dataset: 'nginx.access' },
      { enabled: true, dataset: 'nginx.access' },
    ]);
    expect(getAgentlessThroughputIndexPatterns(policy)).toEqual(['logs-nginx.access-*']);
  });

  it('returns distinct patterns for streams with different datasets', () => {
    const policy = makePolicy([
      { enabled: true, type: 'logs', dataset: 'nginx.access' },
      { enabled: true, type: 'metrics', dataset: 'nginx.status' },
    ]);
    expect(getAgentlessThroughputIndexPatterns(policy)).toEqual([
      'logs-nginx.access-*',
      'metrics-nginx.status-*',
    ]);
  });

  it('flattens streams across multiple inputs', () => {
    const policy = {
      inputs: [
        {
          type: 'input-a',
          enabled: true,
          streams: [{ enabled: true, data_stream: { type: 'logs', dataset: 'nginx.access' } }],
        },
        {
          type: 'input-b',
          enabled: true,
          streams: [{ enabled: true, data_stream: { type: 'metrics', dataset: 'nginx.status' } }],
        },
      ],
    } as unknown as Pick<PackagePolicy, 'inputs'>;
    expect(getAgentlessThroughputIndexPatterns(policy)).toEqual([
      'logs-nginx.access-*',
      'metrics-nginx.status-*',
    ]);
  });

  it('widens the pattern to the package namespace when dynamic_dataset is true', () => {
    // Okta EA: dataset is entityanalytics_okta.entity but routing rules divert all
    // documents to entityanalytics_okta.user and entityanalytics_okta.device.
    const policy = makePolicy([
      { enabled: true, dataset: 'entityanalytics_okta.entity', dynamicDataset: true },
    ]);
    expect(getAgentlessThroughputIndexPatterns(policy)).toEqual(['logs-entityanalytics_okta.*-*']);
  });

  it('uses the explicit type when dynamic_dataset is true', () => {
    const policy = makePolicy([
      { enabled: true, type: 'metrics', dataset: 'mypkg.entity', dynamicDataset: true },
    ]);
    expect(getAgentlessThroughputIndexPatterns(policy)).toEqual(['metrics-mypkg.*-*']);
  });

  it('deduplicates widened patterns from multiple dynamic_dataset streams in the same package', () => {
    // Two different declared data-stream names under the same package both collapse to the same widened pattern.
    const policy = makePolicy([
      { enabled: true, dataset: 'entityanalytics_okta.entity', dynamicDataset: true },
      { enabled: true, dataset: 'entityanalytics_okta.other', dynamicDataset: true },
    ]);
    expect(getAgentlessThroughputIndexPatterns(policy)).toEqual(['logs-entityanalytics_okta.*-*']);
  });

  it('treats dynamic_dataset: false the same as absent (uses the exact dataset pattern)', () => {
    const policy = makePolicy([{ enabled: true, dataset: 'pkg.ds', dynamicDataset: false }]);
    expect(getAgentlessThroughputIndexPatterns(policy)).toEqual(['logs-pkg.ds-*']);
  });

  it('mixes regular and dynamic_dataset streams correctly', () => {
    const policy = makePolicy([
      { enabled: true, dataset: 'nginx.access' },
      { enabled: true, dataset: 'entityanalytics_okta.entity', dynamicDataset: true },
    ]);
    expect(getAgentlessThroughputIndexPatterns(policy)).toEqual([
      'logs-nginx.access-*',
      'logs-entityanalytics_okta.*-*',
    ]);
  });

  it('excludes disabled streams while including enabled ones in the same input', () => {
    const policy = {
      inputs: [
        {
          type: 'input-a',
          enabled: true,
          streams: [
            { enabled: true, data_stream: { type: 'logs', dataset: 'nginx.access' } },
            { enabled: false, data_stream: { type: 'logs', dataset: 'nginx.error' } },
          ],
        },
      ],
    } as unknown as Pick<PackagePolicy, 'inputs'>;
    expect(getAgentlessThroughputIndexPatterns(policy)).toEqual(['logs-nginx.access-*']);
  });
});
