/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import supertest from 'supertest';
import type { CoreSetup } from '@kbn/core/server';
import type { SetupServerReturn } from '@kbn/core-test-helpers-test-utils';
import { setupServer } from '@kbn/core-test-helpers-test-utils';
import { loggerMock } from '@kbn/logging-mocks';
import { registerRoutes } from '@kbn/server-route-repository';
import {
  FEATURE_CONFIDENCE,
  FEATURE_DESCRIPTION,
  FEATURE_EVIDENCE,
  FEATURE_EXPIRES_AT,
  FEATURE_ID,
  FEATURE_LAST_SEEN,
  FEATURE_META,
  FEATURE_PROPERTIES,
  FEATURE_STATUS,
  FEATURE_SUBTYPE,
  FEATURE_TAGS,
  FEATURE_TITLE,
  FEATURE_TYPE,
  FEATURE_UUID,
  STREAM_NAME,
} from '../../../../../lib/streams/feature/fields';
import { FeatureClient } from '../../../../../lib/streams/feature/feature_client';
import { listAllFeaturesRoute } from '../route';

const pluginId = Symbol('streams');

describe('GET /internal/streams/_features', () => {
  let server: SetupServerReturn['server'];
  let createRouter: SetupServerReturn['createRouter'];

  const mockLogger = loggerMock.create();

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-02-12T00:00:00.000Z'));

    ({ server, createRouter } = await setupServer(pluginId));
  });

  afterEach(async () => {
    await server.stop();
    jest.useRealTimers();
  });

  it('filters out expired features', async () => {
    const now = Date.now();
    const streamA = 'stream-a';
    const streamB = 'stream-b';

    const storedExpired = createStoredFeature({
      [FEATURE_UUID]: 'expired-uuid',
      [FEATURE_ID]: 'expired-id',
      [STREAM_NAME]: streamA,
      [FEATURE_EXPIRES_AT]: new Date(now - 60_000).toISOString(),
    });

    const storedNotExpired = createStoredFeature({
      [FEATURE_UUID]: 'active-uuid',
      [FEATURE_ID]: 'active-id',
      [STREAM_NAME]: streamA,
      [FEATURE_EXPIRES_AT]: new Date(now + 60_000).toISOString(),
    });

    const storedNoExpiry = createStoredFeature({
      [FEATURE_UUID]: 'no-expiry-uuid',
      [FEATURE_ID]: 'no-expiry-id',
      [STREAM_NAME]: streamB,
      [FEATURE_EXPIRES_AT]: undefined,
    });

    const storageClient = {
      search: jest.fn(async ({ query }: any) => {
        const filterClauses: any[] = query?.bool?.filter ?? [];

        const streamsClause = filterClauses.find(
          (clause) => clause?.terms?.[STREAM_NAME] !== undefined
        );
        const allowedStreams: string[] = streamsClause?.terms?.[STREAM_NAME] ?? [];

        const hasExpiresAtFilter = filterClauses.some((clause) => {
          const should = clause?.bool?.should;
          if (!Array.isArray(should)) return false;

          const hasMissingExpiresAt = should.some(
            (item: any) => item?.bool?.must_not?.exists?.field === FEATURE_EXPIRES_AT
          );
          const hasRangeExpiresAt = should.some((item: any) => {
            const range = item?.range;
            if (!range || typeof range !== 'object') return false;
            return Object.prototype.hasOwnProperty.call(range, FEATURE_EXPIRES_AT);
          });

          return hasMissingExpiresAt && hasRangeExpiresAt;
        });

        const allDocs = [storedExpired, storedNotExpired, storedNoExpiry].filter((doc) =>
          allowedStreams.includes(doc[STREAM_NAME])
        );

        const returnedDocs = hasExpiresAtFilter
          ? allDocs.filter((doc) => {
              const expiresAt = doc[FEATURE_EXPIRES_AT];
              if (!expiresAt) return true;
              return Date.parse(expiresAt) >= now;
            })
          : allDocs;

        return {
          hits: {
            total: { value: returnedDocs.length, relation: 'eq' },
            hits: returnedDocs.map((doc) => ({ _source: doc })),
          },
        };
      }),
    };

    const featureClient = new FeatureClient({ storageClient } as any);

    const getScopedClients = async () =>
      ({
        featureClient,
        streamsClient: {
          listStreams: jest.fn(async () => [{ name: streamA }, { name: streamB }]),
        },
        licensing: {
          getLicense: jest.fn(async () => ({ hasAtLeast: jest.fn(() => true) })),
        },
        uiSettingsClient: {
          get: jest.fn(async () => true),
        },
      } as any);

    const telemetry = {
      startTrackingEndpointLatency: jest.fn(() => () => {}),
      reportStreamsStateError: jest.fn(),
    };

    const streamsServer = {
      core: {
        pricing: {
          isFeatureAvailable: jest.fn(() => true),
        },
      },
    };

    registerRoutes({
      core: { http: { createRouter: () => createRouter('/') } } as unknown as CoreSetup,
      repository: listAllFeaturesRoute,
      logger: mockLogger,
      runDevModeChecks: false,
      dependencies: {
        getScopedClients,
        telemetry,
        server: streamsServer,
        processorSuggestions: {},
      },
    });

    await server.start();

    const response = await supertest(server.listener)
      .get('/internal/streams/_features')
      .expect(200);

    expect(response.body.features).toEqual([
      expect.objectContaining({ uuid: 'active-uuid', id: 'active-id' }),
      expect.objectContaining({ uuid: 'no-expiry-uuid', id: 'no-expiry-id' }),
    ]);
    expect(response.body.features).toEqual(
      expect.not.arrayContaining([expect.objectContaining({ uuid: 'expired-uuid' })])
    );
  });
});

function createStoredFeature(overrides: Record<string, unknown>) {
  const nowIso = new Date(Date.now()).toISOString();
  return {
    [FEATURE_UUID]: 'uuid',
    [FEATURE_ID]: 'id',
    [STREAM_NAME]: 'stream',
    [FEATURE_TYPE]: 'type',
    [FEATURE_SUBTYPE]: 'subtype',
    [FEATURE_TITLE]: 'title',
    [FEATURE_DESCRIPTION]: 'description',
    [FEATURE_PROPERTIES]: {},
    [FEATURE_CONFIDENCE]: 0.5,
    [FEATURE_EVIDENCE]: [],
    [FEATURE_STATUS]: 'active',
    [FEATURE_LAST_SEEN]: nowIso,
    [FEATURE_TAGS]: [],
    [FEATURE_META]: {},
    [FEATURE_EXPIRES_AT]: undefined,
    ...overrides,
  };
}
