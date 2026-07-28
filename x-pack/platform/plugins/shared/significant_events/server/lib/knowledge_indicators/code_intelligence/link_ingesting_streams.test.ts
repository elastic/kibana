/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Feature } from '@kbn/significant-events-schema';
import type { KIBulkOperation, KnowledgeIndicatorClient } from '../knowledge_indicator_client';
import {
  linkServiceEntities,
  serviceEntityConfidence,
  type ServiceCodeMetadata,
  type StreamSamplingSource,
} from './link_ingesting_streams';

const STREAMS: StreamSamplingSource[] = [
  { name: 'logs.otel', index: 'logs.otel', convention: 'otel' },
  { name: 'logs.ecs', index: 'logs.ecs', convention: 'ecs' },
];

const createEsClient = (): ElasticsearchClient =>
  ({
    fieldCaps: jest.fn(async () => ({
      fields: {
        message: { keyword: { type: 'keyword', aggregatable: true, searchable: true } },
      },
    })),
  } as unknown as ElasticsearchClient);

const createKiClient = (featuresByStream: Record<string, Feature[]> = {}) => {
  const bulk = jest.fn<Promise<{ applied: number }>, [string, KIBulkOperation[]]>(async () => ({
    applied: 1,
  }));
  const kiClient = {
    getFeatures: jest.fn(async (stream: string) => ({ hits: featuresByStream[stream] ?? [] })),
    bulk,
  } as unknown as KnowledgeIndicatorClient;
  return { kiClient, bulk };
};

const link = async (
  metadata: ServiceCodeMetadata | undefined,
  featuresByStream: Record<string, Feature[]> = {},
  streams: StreamSamplingSource[] = STREAMS
) => {
  const { kiClient, bulk } = createKiClient(featuresByStream);
  const result = await linkServiceEntities({
    serviceName: 'checkout',
    repository: 'acme/checkout',
    fingerprint: 'abc123',
    metadata,
    streams,
    esClient: createEsClient(),
    kiClient,
    runId: 'run-1',
    logger: loggerMock.create(),
  });
  return { result, bulk };
};

describe('linkServiceEntities', () => {
  it('calibrates confidence and persists code-derived service metadata', async () => {
    const inferred = { environmentVariables: ['PORT=3000'] };
    const grounded = {
      environmentVariables: ['OTEL_SERVICE_NAME=checkout'],
      serviceRoot: 'services/checkout',
      iacSignals: [{ kind: 'kubernetes', path: 'services/checkout/deployment.yaml' }],
      gitSha: 'abc123',
    } satisfies ServiceCodeMetadata;

    expect(serviceEntityConfidence(grounded)).toBeGreaterThan(serviceEntityConfidence(inferred));
    expect(serviceEntityConfidence(inferred)).toBeLessThan(100);

    const { bulk } = await link(grounded);
    const operation = bulk.mock.calls[0][1][0] as { index: { feature: Feature } };
    const feature = operation.index.feature;
    expect(feature.confidence).toBe(serviceEntityConfidence(grounded));
    expect(feature.properties).toMatchObject({
      service_root: 'services/checkout',
      iac_signals: [{ kind: 'kubernetes', path: 'services/checkout/deployment.yaml' }],
      git_sha: 'abc123',
    });
  });

  it('narrows predictive entities to the OTel stream', async () => {
    const { result } = await link({ loggingPattern: 'otel' });

    expect(result.streams).toEqual(['logs.otel']);
  });

  it('keeps every stream when telemetry metadata is unknown', async () => {
    const { result } = await link(undefined);

    expect(result.streams).toEqual(['logs.ecs', 'logs.otel']);
  });

  it('falls back to every stream when the selected family has no bindings', async () => {
    const { result } = await link({ loggingPattern: 'otel' }, {}, [
      { name: 'logs.ecs', index: 'logs.ecs', convention: 'ecs' },
    ]);

    expect(result.streams).toEqual(['logs.ecs']);
  });

  it('merges with a matching log entity regardless of its telemetry family', async () => {
    const matchingLogEntity = {
      id: 'checkout',
      uuid: 'checkout-uuid',
      stream_name: 'logs.ecs',
      type: 'entity',
      subtype: 'service',
      title: 'checkout',
      description: 'Observed in logs',
      properties: { name: 'checkout' },
      confidence: 80,
      evidence: ['logs: checkout observed'],
    } satisfies Feature;
    const { result } = await link({ loggingPattern: 'otel' }, { 'logs.ecs': [matchingLogEntity] });

    expect(result.streams).toEqual(['logs.ecs']);
  });
});
