/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import { WORKFLOWS_EXECUTIONS_INDEX } from '@kbn/workflows-management-plugin/common';
import { DEFAULT_RUN_LIMITS, MAX_RUN_LIMIT } from '../../../common';
import { SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID } from '@kbn/workflows/managed';
import { createRunQuotaService, resolveSettings } from './run_quota_service';
import { RUN_QUOTA_SETTINGS_SO_TYPE } from './saved_object';

const request = {} as KibanaRequest;

const notFound = () =>
  SavedObjectsErrorHelpers.createGenericNotFoundError(RUN_QUOTA_SETTINGS_SO_TYPE, 'missing');

const createHarness = ({
  attributes,
  searchResponse,
}: {
  attributes?: Record<string, unknown>;
  searchResponse?: unknown;
} = {}) => {
  const get = jest.fn(async () => {
    if (!attributes) {
      throw notFound();
    }
    return { attributes };
  });
  const create = jest.fn(async () => ({}));
  const search = jest.fn(
    async () => searchResponse ?? { aggregations: { workflows: { buckets: [] } } }
  );

  const server = {
    core: {
      savedObjects: {
        createInternalRepository: jest.fn(() => ({ get })),
        getScopedClient: jest.fn(() => ({ get, create })),
      },
      elasticsearch: { client: { asInternalUser: { search } } },
    },
  } as unknown as StreamsServer;

  const service = createRunQuotaService({
    logger: loggerMock.create(),
    server,
  });

  return { service, get, create, search };
};

describe('resolveSettings', () => {
  it('falls back to the defaults when nothing was ever written', () => {
    expect(resolveSettings(undefined).limits).toEqual({
      ki_extraction: { enabled: true, max: DEFAULT_RUN_LIMITS.ki_extraction },
      memory: { enabled: true, max: DEFAULT_RUN_LIMITS.memory },
      detection: { enabled: true, max: DEFAULT_RUN_LIMITS.detection },
      investigation: { enabled: true, max: DEFAULT_RUN_LIMITS.investigation },
    });
  });

  it('clamps out-of-range limits', () => {
    const { limits } = resolveSettings({
      timezone: 'UTC',
      limits: {
        detection: { enabled: true, max: 0 },
        investigation: { enabled: true, max: MAX_RUN_LIMIT * 10 },
      },
    });

    expect(limits.detection.max).toBe(1);
    expect(limits.investigation.max).toBe(MAX_RUN_LIMIT);
  });

  it('fills unknown groups from the defaults and ignores groups it does not know', () => {
    const { limits, timezone } = resolveSettings({
      timezone: 'Europe/Zurich',
      limits: {
        memory: { enabled: false, max: 4 },
        from_a_newer_version: { enabled: true, max: 1 },
      },
    });

    expect(timezone).toBe('UTC');
    expect(limits.memory).toEqual({ enabled: false, max: 4 });
    expect(limits.detection).toEqual({ enabled: true, max: DEFAULT_RUN_LIMITS.detection });
    expect(limits).not.toHaveProperty('from_a_newer_version');
  });

  it('always returns UTC regardless of stored timezone', () => {
    expect(resolveSettings({ timezone: 'Mars/Olympus', limits: {} }).timezone).toBe('UTC');
    expect(resolveSettings({ timezone: 'Europe/Zurich', limits: {} }).timezone).toBe('UTC');
  });
});

describe('createRunQuotaService', () => {
  it('reports usage per group from workflow executions', async () => {
    const { service, search } = createHarness({
      searchResponse: {
        aggregations: {
          workflows: {
            buckets: [
              {
                key: SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID,
                doc_count: 20,
                triggers: {
                  buckets: [
                    { key: 'scheduled', doc_count: 18 },
                    { key: 'manual', doc_count: 2 },
                  ],
                },
              },
            ],
          },
        },
      },
    });

    const quotas = await service.getQuotas();
    const detection = quotas.groups.find(({ group }) => group === 'detection')!;
    const memory = quotas.groups.find(({ group }) => group === 'memory')!;

    expect(detection.used).toBe(20);
    expect(detection.remaining).toBe(0);
    expect(detection.exhausted).toBe(true);
    expect(detection.byTrigger).toEqual({ scheduled: 18, manual: 2 });
    expect(memory.used).toBe(0);
    expect(memory.exhausted).toBe(false);
    expect(quotas.ledgerUnavailable).toBe(false);

    const [[searchArgs]] = search.mock.calls as unknown as Array<
      [{ index: string; query: { bool: { filter: unknown[] } } }]
    >;
    expect(searchArgs.index).toBe(WORKFLOWS_EXECUTIONS_INDEX);
    expect(searchArgs.query.bool.filter).toContainEqual({
      term: { isTestRun: false },
    });
  });

  it('reports zero usage when executions cannot be read', async () => {
    const { service, search } = createHarness();
    search.mockRejectedValue(new Error('executions down'));

    const quotas = await service.getQuotas();

    expect(quotas.ledgerUnavailable).toBe(true);
    expect(quotas.groups.every(({ used }) => used === 0)).toBe(true);
  });

  it('never reports a group as exhausted while its limit is disabled', async () => {
    const { service } = createHarness({
      attributes: { timezone: 'UTC', limits: { memory: { enabled: false, max: 1 } } },
      searchResponse: {
        aggregations: {
          workflows: {
            buckets: [
              {
                key: 'system-significant-events-memory-synthesis',
                doc_count: 99,
                triggers: { buckets: [] },
              },
            ],
          },
        },
      },
    });

    const memory = (await service.getQuotas()).groups.find(({ group }) => group === 'memory')!;

    expect(memory.used).toBe(99);
    expect(memory.remaining).toBeNull();
    expect(memory.exhausted).toBe(false);
  });

  it('merges a partial update into the stored settings without reinstalling workflows', async () => {
    const { service, create } = createHarness({
      attributes: { timezone: 'UTC', limits: { memory: { enabled: true, max: 4 } } },
    });

    const next = await service.updateSettings({
      request,
      update: { limits: { detection: { enabled: false, max: 30 } } },
      updatedBy: 'elastic',
    });

    expect(next.limits.detection).toEqual({ enabled: false, max: 30 });
    expect(next.limits.memory).toEqual({ enabled: true, max: 4 });
    expect(create).toHaveBeenCalledWith(
      RUN_QUOTA_SETTINGS_SO_TYPE,
      expect.objectContaining({ updatedBy: 'elastic' }),
      expect.objectContaining({ overwrite: true })
    );
  });

  it('ignores timezone in updateSettings and always writes UTC', async () => {
    const { service } = createHarness();

    const result = await service.updateSettings({
      request,
      update: { timezone: 'Europe/Zurich' },
    });
    expect(result.timezone).toBe('UTC');
  });
});
