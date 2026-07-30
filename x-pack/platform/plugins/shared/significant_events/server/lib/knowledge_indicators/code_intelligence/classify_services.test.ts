/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceClient } from '@kbn/inference-common';
import { loggerMock } from '@kbn/logging-mocks';
import { classifyServices } from './classify_services';
import type { IacSignal, ServiceCandidateRoot } from './types';

const cand = (over: Partial<ServiceCandidateRoot> = {}): ServiceCandidateRoot => ({
  repository: 'open-telemetry/opentelemetry-demo',
  gitSha: 'abc123',
  serviceRoot: 'src/checkout',
  markers: ['Dockerfile', 'go.mod'],
  language: 'Go',
  ...over,
});

const mockInference = (
  services:
    | Array<{ name: string; repository: string; serviceRoot: string; language?: string }>
    | Error
) => {
  const output = jest.fn(async () => {
    if (services instanceof Error) {
      throw services;
    }
    return { id: 'classify_services', output: { services }, content: '' };
  });
  return { output } as unknown as InferenceClient;
};

const opts = (candidates: ServiceCandidateRoot[]) => ({
  manifestPathsByRepo: new Map<string, string[]>([
    ['open-telemetry/opentelemetry-demo', ['compose.yaml']],
  ]),
  iacSignalsByRepo: new Map<string, IacSignal[]>([
    ['open-telemetry/opentelemetry-demo', [{ kind: 'compose' as const, path: 'compose.yaml' }]],
  ]),
  candidates,
  logger: loggerMock.create(),
});

describe('classifyServices', () => {
  it('returns [] for no candidates without calling inference', async () => {
    const inferenceClient = mockInference([]);
    const services = await classifyServices({
      inferenceClient,
      connectorId: 'c',
      ...opts([]),
    });
    expect(services).toEqual([]);
    expect((inferenceClient as unknown as { output: jest.Mock }).output).not.toHaveBeenCalled();
  });

  it('maps classifier services to DiscoveredService with gitSha + iacSignals from the repo', async () => {
    const candidates = [cand()];
    const inferenceClient = mockInference([
      {
        name: 'checkout',
        repository: 'open-telemetry/opentelemetry-demo',
        serviceRoot: 'src/checkout',
      },
    ]);
    const services = await classifyServices({
      inferenceClient,
      connectorId: 'c',
      ...opts(candidates),
    });
    expect(services).toEqual([
      {
        repository: 'open-telemetry/opentelemetry-demo',
        gitSha: 'abc123',
        serviceRoot: 'src/checkout',
        name: 'checkout',
        language: 'Go',
        iacSignals: [{ kind: 'compose', path: 'compose.yaml' }],
      },
    ]);
  });

  it('collapses env duplicates: 3 candidate roots -> 1 logical service', async () => {
    const candidates = [
      cand({ serviceRoot: 'workspaces/acme-production', markers: ['*.tf'], language: 'unknown' }),
      cand({ serviceRoot: 'workspaces/acme-staging', markers: ['*.tf'], language: 'unknown' }),
      cand({ serviceRoot: 'workspaces/acme-qa', markers: ['*.tf'], language: 'unknown' }),
    ];
    const inferenceClient = mockInference([
      {
        name: 'acme',
        repository: 'open-telemetry/opentelemetry-demo',
        serviceRoot: 'workspaces/acme-production',
        language: 'HCL',
      },
    ]);
    const services = await classifyServices({
      inferenceClient,
      connectorId: 'c',
      ...opts(candidates),
    });
    expect(services).toHaveLength(1);
    expect(services[0].name).toBe('acme');
    expect(services[0].language).toBe('HCL');
  });

  it('dedupes repeated (repository, name) from the classifier', async () => {
    const candidates = [cand()];
    const inferenceClient = mockInference([
      {
        name: 'checkout',
        repository: 'open-telemetry/opentelemetry-demo',
        serviceRoot: 'src/checkout',
      },
      {
        name: 'checkout',
        repository: 'open-telemetry/opentelemetry-demo',
        serviceRoot: 'src/checkout',
      },
    ]);
    const services = await classifyServices({
      inferenceClient,
      connectorId: 'c',
      ...opts(candidates),
    });
    expect(services).toHaveLength(1);
  });

  it('drops classifier rows for unknown repositories', async () => {
    const candidates = [cand()];
    const inferenceClient = mockInference([
      { name: 'ghost', repository: 'someone/else', serviceRoot: 'src/ghost' },
    ]);
    const services = await classifyServices({
      inferenceClient,
      connectorId: 'c',
      ...opts(candidates),
    });
    expect(services).toEqual([]);
  });

  it('degrades gracefully on inference failure: one service per candidate root', async () => {
    const candidates = [
      cand({ serviceRoot: 'src/checkout' }),
      cand({ serviceRoot: 'src/ad', markers: ['Dockerfile'], language: 'unknown' }),
    ];
    const inferenceClient = mockInference(new Error('inference down'));
    const services = await classifyServices({
      inferenceClient,
      connectorId: 'c',
      ...opts(candidates),
    });
    expect(services.map((s) => s.name).sort()).toEqual(['ad', 'checkout']);
  });
});
