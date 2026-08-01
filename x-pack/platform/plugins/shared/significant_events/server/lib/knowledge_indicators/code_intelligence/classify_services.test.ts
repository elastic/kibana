/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceClient } from '@kbn/inference-common';
import { loggerMock } from '@kbn/logging-mocks';
import { classifyServices } from './classify_services';
import type { IacSignal, IndexedRepoRef, LanguageCount, ServiceCandidateRoot } from './types';

const cand = (over: Partial<ServiceCandidateRoot> = {}): ServiceCandidateRoot => ({
  repository: 'open-telemetry/opentelemetry-demo',
  gitSha: 'abc123',
  serviceRoot: 'src/checkout',
  markers: ['Dockerfile', 'go.mod'],
  language: 'Go',
  hasEntrypoint: true,
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

const repo: IndexedRepoRef = {
  repository: 'open-telemetry/opentelemetry-demo',
  org: 'open-telemetry',
  repo: 'opentelemetry-demo',
  gitSha: 'abc123',
};

const opts = (candidates: ServiceCandidateRoot[]) => ({
  repos: [repo],
  manifestPathsByRepo: new Map<string, string[]>([
    ['open-telemetry/opentelemetry-demo', ['compose.yaml']],
  ]),
  manifestLinesByRepo: new Map<string, string[]>(),
  serviceNameLinesByRepo: new Map<string, string[]>(),
  iacSignalsByRepo: new Map<string, IacSignal[]>([
    ['open-telemetry/opentelemetry-demo', [{ kind: 'compose' as const, path: 'compose.yaml' }]],
  ]),
  readmeLinesByRepo: new Map<string, string[]>(),
  repositoryLanguagesByRepo: new Map<string, LanguageCount[]>(),
  otelDetectionByRoot: new Map(),
  candidates,
  logger: loggerMock.create(),
});

describe('classifyServices', () => {
  it('returns [] for no candidates or manifest lines without calling inference', async () => {
    const inferenceClient = mockInference([]);
    const services = await classifyServices({
      inferenceClient,
      connectorId: 'c',
      ...opts([]),
    });
    expect(services).toEqual([]);
    expect((inferenceClient as unknown as { output: jest.Mock }).output).not.toHaveBeenCalled();
  });

  it('classifies manifest-only services and keeps their own root + repo gitSha', async () => {
    const inferenceClient = mockInference([
      {
        name: 'redis',
        repository: 'open-telemetry/opentelemetry-demo',
        serviceRoot: 'deploy',
        language: 'unknown',
      },
    ]);
    const options = opts([]);
    options.manifestLinesByRepo.set('open-telemetry/opentelemetry-demo', [
      'deploy/compose.yaml:4\t  image: redis:7',
    ]);

    const services = await classifyServices({
      inferenceClient,
      connectorId: 'c',
      ...options,
    });

    expect((inferenceClient as unknown as { output: jest.Mock }).output).toHaveBeenCalledWith(
      expect.objectContaining({ input: expect.stringContaining('image: redis:7') })
    );
    expect(services[0]).toEqual(
      expect.objectContaining({ serviceRoot: 'deploy', gitSha: 'abc123', name: 'redis' })
    );
  });

  it('includes service-name declarations and entrypoint evidence in the prompt', async () => {
    const candidates = [cand(), cand({ serviceRoot: 'src/lib', hasEntrypoint: false })];
    const inferenceClient = mockInference([]);
    const options = opts(candidates);
    options.serviceNameLinesByRepo.set('open-telemetry/opentelemetry-demo', [
      'src/checkout/config.env:1\tOTEL_SERVICE_NAME=checkout',
    ]);

    await classifyServices({ inferenceClient, connectorId: 'c', ...options });

    const call = (inferenceClient as unknown as { output: jest.Mock }).output.mock.calls[0][0];
    expect(call.input).toContain('OTEL_SERVICE_NAME=checkout');
    expect(call.input).toContain('entrypoint=yes');
    expect(call.input).toContain('entrypoint=no');
    expect(call.system).toContain('DECLARED');
  });

  it('preserves a returned service root that matches no candidate', async () => {
    const candidates = [cand({ serviceRoot: 'src/arbitrary' })];
    const inferenceClient = mockInference([
      {
        name: 'manifest-service',
        repository: 'open-telemetry/opentelemetry-demo',
        serviceRoot: 'deploy/runtime',
      },
    ]);

    const services = await classifyServices({
      inferenceClient,
      connectorId: 'c',
      ...opts(candidates),
    });

    expect(services[0].serviceRoot).toBe('deploy/runtime');
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
    // The classified `checkout` service, plus the always-on repo-level service
    // synthesized for the (app-code) repo since none was named after it.
    expect(services).toContainEqual({
      repository: 'open-telemetry/opentelemetry-demo',
      gitSha: 'abc123',
      serviceRoot: 'src/checkout',
      name: 'checkout',
      language: 'Go',
      iacSignals: [{ kind: 'compose', path: 'compose.yaml' }],
      hasOtel: false,
      signalCounts: expect.any(Object),
    });
    expect(services).toContainEqual(
      expect.objectContaining({ name: 'opentelemetry-demo', serviceRoot: '', language: 'Go' })
    );
  });

  it('feeds repo-root README lines into the classifier prompt', async () => {
    const inferenceClient = mockInference([]);
    const options = opts([cand()]);
    options.readmeLinesByRepo.set('open-telemetry/opentelemetry-demo', [
      '# OpenTelemetry Demo',
      'A microservices demo application.',
    ]);

    await classifyServices({ inferenceClient, connectorId: 'c', ...options });

    const call = (inferenceClient as unknown as { output: jest.Mock }).output.mock.calls[0][0];
    expect(call.input).toContain('readme\t# OpenTelemetry Demo');
    expect(call.system).toContain('README');
  });

  it('synthesizes a repo-level service for an app-code repo the classifier returned nothing for', async () => {
    // Monorepo case (e.g. kibana): candidate roots exist, but the classifier
    // judged them a non-deployable aggregate and returned nothing.
    const candidates = [
      cand({
        serviceRoot: 'packages/core',
        hasEntrypoint: false,
        language: 'JavaScript/TypeScript',
      }),
    ];
    const inferenceClient = mockInference([]);

    const services = await classifyServices({
      inferenceClient,
      connectorId: 'c',
      ...opts(candidates),
    });

    expect(services).toEqual([
      expect.objectContaining({
        repository: 'open-telemetry/opentelemetry-demo',
        serviceRoot: '',
        name: 'opentelemetry-demo',
        language: 'JavaScript/TypeScript',
      }),
    ]);
  });

  it('does not synthesize a repo-level service for a pure-IaC repo', async () => {
    const candidates = [
      cand({
        serviceRoot: 'modules/vpc',
        markers: ['*.tf'],
        language: 'hcl',
        hasEntrypoint: false,
      }),
    ];
    const inferenceClient = mockInference([]);

    const services = await classifyServices({
      inferenceClient,
      connectorId: 'c',
      ...opts(candidates),
    });

    expect(services).toEqual([]);
  });

  it('collapses env duplicates: 3 candidate roots -> 1 logical service', async () => {
    const candidates = [
      cand({
        serviceRoot: 'workspaces/acme-production',
        markers: ['*.tf'],
        language: 'hcl',
        hasEntrypoint: false,
      }),
      cand({
        serviceRoot: 'workspaces/acme-staging',
        markers: ['*.tf'],
        language: 'hcl',
        hasEntrypoint: false,
      }),
      cand({
        serviceRoot: 'workspaces/acme-qa',
        markers: ['*.tf'],
        language: 'hcl',
        hasEntrypoint: false,
      }),
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
    expect(services.filter((s) => s.name === 'checkout')).toHaveLength(1);
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
    // The unknown-repo row is dropped; the known app-code repo still gets its
    // synthesized repo-level service.
    expect(services.filter((s) => s.repository === 'someone/else')).toHaveLength(0);
    expect(services).toEqual([
      expect.objectContaining({ name: 'opentelemetry-demo', serviceRoot: '' }),
    ]);
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
