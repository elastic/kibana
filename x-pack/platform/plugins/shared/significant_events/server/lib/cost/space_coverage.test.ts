/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import { GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING } from '@kbn/management-settings-ids';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { createInMemoryRunQuotaRepository } from '../run_quotas/in_memory_repository.test_utils';
import {
  createSpaceTrackingAccess,
  getSpaceTrackingCoverage,
  setTokenUsageTrackingInAllSpaces,
  type CostTrackingSpace,
  type SpaceTrackingAccess,
} from './space_coverage';

const spaces: CostTrackingSpace[] = [
  { id: 'default', name: 'Default' },
  { id: 'space-a', name: 'Space A' },
];

const createAccess = ({
  initial = { default: true, 'space-a': false },
  listedSpaces = spaces,
  failReads = [],
  failWrites = [],
}: {
  initial?: Record<string, boolean>;
  listedSpaces?: CostTrackingSpace[];
  failReads?: string[];
  failWrites?: string[];
} = {}) => {
  const state = new Map(Object.entries(initial));
  const setTrackingEnabled = jest.fn(async (spaceId: string, enabled: boolean) => {
    if (failWrites.includes(spaceId)) {
      throw new Error(`write failed for ${spaceId}`);
    }
    state.set(spaceId, enabled);
  });
  const access: SpaceTrackingAccess = {
    listSpaces: jest.fn().mockResolvedValue(listedSpaces),
    getTrackingEnabled: jest.fn(async (spaceId: string) => {
      if (failReads.includes(spaceId)) {
        throw new Error(`read failed for ${spaceId}`);
      }
      return state.get(spaceId) ?? false;
    }),
    setTrackingEnabled,
  };
  return { access, state, setTrackingEnabled };
};

describe('space tracking coverage', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses namespace-scoped clients and the token-usage tracking setting', async () => {
    const get = jest.fn().mockResolvedValue(true);
    const setMany = jest.fn().mockResolvedValue(undefined);
    const asScopedToClient = jest.fn().mockReturnValue({ get, setMany });
    const asScopedToNamespace = jest.fn().mockReturnValue({ namespace: 'space-a' });
    const getAll = jest.fn().mockResolvedValue([{ id: 'space-a', name: 'Space A' }]);
    const access = createSpaceTrackingAccess({
      coreStart: {
        savedObjects: {
          getUnsafeInternalClient: jest.fn().mockReturnValue({ asScopedToNamespace }),
        },
        uiSettings: { asScopedToClient },
      } as unknown as CoreStart,
      spaces: {
        spacesService: {
          createSpacesClient: jest.fn().mockReturnValue({ getAll }),
        },
      } as unknown as SpacesPluginStart,
      request: {} as KibanaRequest,
    });

    await expect(access.listSpaces()).resolves.toEqual([{ id: 'space-a', name: 'Space A' }]);
    await expect(access.getTrackingEnabled('space-a')).resolves.toBe(true);
    await access.setTrackingEnabled('space-a', false);

    expect(asScopedToNamespace).toHaveBeenCalledWith('space-a');
    expect(get).toHaveBeenCalledWith(GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING);
    expect(setMany).toHaveBeenCalledWith({
      [GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING]: false,
    });
  });

  it('reports deployment coverage while gating figures on the current space', async () => {
    const { access } = createAccess();

    const coverage = await getSpaceTrackingCoverage({
      access,
      audit: undefined,
      currentSpaceId: 'space-a',
      logger,
    });

    expect(coverage).toMatchObject({
      currentSpaceTracking: 'disabled',
      coveredSpaceCount: 1,
      totalSpaceCount: 2,
      unavailableSpaceCount: 0,
      allSpacesTracked: false,
      untrackedSpaces: [{ id: 'space-a', name: 'Space A' }],
      newSpaces: spaces,
    });
    expect(coverage.fullTrackingSince).toBeUndefined();
  });

  it('reports a full-coverage watermark only when every space is tracked and audited', async () => {
    const { access } = createAccess({ initial: { default: true, 'space-a': true } });

    const coverage = await getSpaceTrackingCoverage({
      access,
      audit: {
        knownSpaces: spaces,
        events: [
          {
            spaceId: 'default',
            enabled: true,
            changedAt: '2026-08-01T00:00:00.000Z',
            changedBy: 'operator',
          },
          {
            spaceId: 'space-a',
            enabled: true,
            changedAt: '2026-08-03T00:00:00.000Z',
            changedBy: 'operator',
          },
        ],
      },
      currentSpaceId: 'default',
      logger,
    });

    expect(coverage).toMatchObject({
      currentSpaceTracking: 'enabled',
      coveredSpaceCount: 2,
      totalSpaceCount: 2,
      unavailableSpaceCount: 0,
      allSpacesTracked: true,
      fullTrackingSince: '2026-08-03T00:00:00.000Z',
      untrackedSpaces: [],
      newSpaces: [],
    });
  });

  it('marks unreadable space settings as unknown instead of treating them as tracked', async () => {
    const { access } = createAccess({ failReads: ['space-a'] });

    const coverage = await getSpaceTrackingCoverage({
      access,
      audit: undefined,
      currentSpaceId: 'space-a',
      logger,
    });

    expect(coverage.currentSpaceTracking).toBe('unknown');
    expect(coverage.unavailableSpaceCount).toBe(1);
    expect(coverage.allSpacesTracked).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('space-a'));
  });
});

describe('setTokenUsageTrackingInAllSpaces', () => {
  it('writes every space, records enablement, and reruns idempotently for new spaces', async () => {
    const repository = createInMemoryRunQuotaRepository();
    const listedSpaces = [...spaces];
    const { access, state, setTrackingEnabled } = createAccess({ listedSpaces });

    const first = await setTokenUsageTrackingInAllSpaces({
      access,
      auditRepository: repository.client,
      enabled: true,
      changedBy: 'operator',
      now: new Date('2026-08-01T00:00:00.000Z'),
    });

    expect(first.updatedSpaceIds).toEqual(['default', 'space-a']);
    expect(first.failedSpaces).toEqual([]);
    expect(first.audit?.events).toEqual([
      {
        spaceId: 'default',
        enabled: true,
        changedAt: '2026-08-01T00:00:00.000Z',
        changedBy: 'operator',
      },
      {
        spaceId: 'space-a',
        enabled: true,
        changedAt: '2026-08-01T00:00:00.000Z',
        changedBy: 'operator',
      },
    ]);
    expect([...state.values()]).toEqual([true, true]);

    listedSpaces.push({ id: 'space-b', name: 'Space B' });
    const second = await setTokenUsageTrackingInAllSpaces({
      access,
      auditRepository: repository.client,
      enabled: true,
      changedBy: 'operator',
      now: new Date('2026-08-02T00:00:00.000Z'),
    });

    expect(setTrackingEnabled).toHaveBeenCalledTimes(5);
    expect(second.audit?.events).toHaveLength(3);
    expect(second.audit?.events.at(-1)).toEqual({
      spaceId: 'space-b',
      enabled: true,
      changedAt: '2026-08-02T00:00:00.000Z',
      changedBy: 'operator',
    });
    expect(second.audit?.knownSpaces).toEqual(listedSpaces);
  });

  it('records disablement and leaves failed spaces out of the updated set', async () => {
    const repository = createInMemoryRunQuotaRepository();
    const { access, state } = createAccess({
      initial: { default: true, 'space-a': true },
      failWrites: ['space-a'],
    });

    const result = await setTokenUsageTrackingInAllSpaces({
      access,
      auditRepository: repository.client,
      enabled: false,
      changedBy: 'operator',
      now: new Date('2026-08-15T00:00:00.000Z'),
    });

    expect(result.updatedSpaceIds).toEqual(['default']);
    expect(result.failedSpaces).toEqual([
      {
        id: 'space-a',
        name: 'Space A',
        error: 'write failed for space-a',
      },
    ]);
    expect(result.audit?.events).toEqual([
      {
        spaceId: 'default',
        enabled: false,
        changedAt: '2026-08-15T00:00:00.000Z',
        changedBy: 'operator',
      },
    ]);
    expect(state.get('default')).toBe(false);
    expect(state.get('space-a')).toBe(true);
  });
});
