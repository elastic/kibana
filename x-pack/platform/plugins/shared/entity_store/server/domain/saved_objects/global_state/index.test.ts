/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsFindResponse,
  SavedObjectsUpdateResponse,
} from '@kbn/core-saved-objects-api-server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { EntityStoreGlobalStateClient } from '.';
import { EntityStoreGlobalStateTypeName } from './types';
import {
  DEFAULT_HISTORY_SNAPSHOT_FREQUENCY,
  LATEST_LOG_EXTRACTION_DEFAULTS,
  type EntityStoreGlobalStateOverrides,
} from './constants';
import { LEGACY_LOG_EXTRACTION_DEFAULTS } from './legacy_defaults';

describe('EntityStoreGlobalStateClient', () => {
  const namespace = 'default';
  const soId = `${EntityStoreGlobalStateTypeName}-${namespace}`;

  let soClient: ReturnType<typeof savedObjectsClientMock.create>;
  let client: EntityStoreGlobalStateClient;

  const mockStored = (attributes?: EntityStoreGlobalStateOverrides, version?: string) => {
    soClient.find.mockResolvedValue({
      total: attributes === undefined ? 0 : 1,
      saved_objects: attributes === undefined ? [] : [{ id: soId, attributes, version }],
      per_page: 1,
      page: 1,
    } as unknown as SavedObjectsFindResponse);
  };

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
    client = new EntityStoreGlobalStateClient(soClient, namespace, loggerMock.create());

    // echo back the written attributes, like the real SO client does
    soClient.create.mockImplementation(async (type, attributes, options) => ({
      id: options?.id ?? soId,
      type,
      attributes,
      references: [],
    }));
    soClient.update.mockImplementation(
      async (type, id, attributes) =>
        ({ id, type, attributes, references: [] } as SavedObjectsUpdateResponse<unknown>)
    );
  });

  describe('find', () => {
    it('returns undefined when no global state exists', async () => {
      mockStored(undefined);

      await expect(client.find()).resolves.toBeUndefined();
    });

    it('strips legacy-era defaults and inflates with current defaults for legacy docs', async () => {
      mockStored({
        defaultsVersion: 'legacy',
        logsExtraction: { ...LEGACY_LOG_EXTRACTION_DEFAULTS, delay: '9m' },
      });

      const state = await client.find();

      expect(state?.logsExtraction).toEqual({ ...LATEST_LOG_EXTRACTION_DEFAULTS, delay: '9m' });
    });

    it('applies the latest defaults on top of stored overrides', async () => {
      mockStored({ logsExtraction: { frequency: '5m' } });

      const state = await client.find();

      expect(state?.logsExtraction).toEqual({
        ...LATEST_LOG_EXTRACTION_DEFAULTS,
        frequency: '5m',
      });
      expect(state?.historySnapshot).toEqual({
        status: 'started',
        frequency: DEFAULT_HISTORY_SNAPSHOT_FREQUENCY,
      });
    });
  });

  describe('init', () => {
    it('fresh install persists provided overrides including values equal to current defaults', async () => {
      mockStored(undefined);

      // frequency '1m' equals the default but is explicitly passed — it is preserved as an override
      // so that future default changes don't silently affect this store
      const state = await client.init({ logsExtraction: { delay: '2m', frequency: '1m' } });

      expect(soClient.create).toHaveBeenCalledWith(
        EntityStoreGlobalStateTypeName,
        {
          defaultsVersion: 'latest',
          logsExtraction: { delay: '2m', frequency: '1m' },
        },
        { id: soId }
      );
      expect(state.logsExtraction).toEqual({
        ...LATEST_LOG_EXTRACTION_DEFAULTS,
        delay: '2m',
        frequency: '1m',
      });
    });

    it('fresh install with no args always persists logsExtraction:{} so the SO schema is satisfied', async () => {
      mockStored(undefined);

      const state = await client.init();

      expect(soClient.create).toHaveBeenCalledWith(
        EntityStoreGlobalStateTypeName,
        expect.objectContaining({ defaultsVersion: 'latest', logsExtraction: {} }),
        { id: soId }
      );
      expect(state.logsExtraction).toEqual(LATEST_LOG_EXTRACTION_DEFAULTS);
    });

    it('re-init without params keeps the existing overrides', async () => {
      mockStored({ logsExtraction: { delay: '9m' } });

      const state = await client.init();

      expect(soClient.update).toHaveBeenCalledWith(
        EntityStoreGlobalStateTypeName,
        soId,
        expect.objectContaining({ logsExtraction: { delay: '9m' } }),
        expect.objectContaining({ mergeAttributes: false })
      );
      expect(state.logsExtraction.delay).toBe('9m');
    });

    it('re-init merges the given state over the existing overrides', async () => {
      mockStored({ logsExtraction: { delay: '9m' } });

      const state = await client.init({ logsExtraction: { lookbackPeriod: '6h' } });

      expect(soClient.update).toHaveBeenCalledWith(
        EntityStoreGlobalStateTypeName,
        soId,
        expect.objectContaining({ logsExtraction: { delay: '9m', lookbackPeriod: '6h' } }),
        expect.objectContaining({ mergeAttributes: false })
      );
      expect(state.logsExtraction.lookbackPeriod).toBe('6h');
      expect(state.logsExtraction.delay).toBe('9m');
    });

    it('re-init preserves execution timestamps when resetting historySnapshot status', async () => {
      mockStored({
        historySnapshot: {
          status: 'stopped',
          frequency: '12h',
          lastExecutionTimestamp: '2026-01-01T00:00:00.000Z',
        },
      });

      const state = await client.init({
        historySnapshot: { status: 'started', frequency: DEFAULT_HISTORY_SNAPSHOT_FREQUENCY },
      });

      expect(state.historySnapshot).toEqual({
        status: 'started',
        frequency: DEFAULT_HISTORY_SNAPSHOT_FREQUENCY,
        lastExecutionTimestamp: '2026-01-01T00:00:00.000Z',
      });
    });

    it('strips legacy-era defaults from the doc and preserves actual overrides on next write', async () => {
      // a doc written before the overrides format has every default of that era baked in
      mockStored({
        defaultsVersion: 'legacy',
        logsExtraction: { ...LEGACY_LOG_EXTRACTION_DEFAULTS, delay: '9m' },
      });

      await client.init();

      expect(soClient.update).toHaveBeenCalledWith(
        EntityStoreGlobalStateTypeName,
        soId,
        expect.objectContaining({
          defaultsVersion: 'latest',
          logsExtraction: expect.objectContaining({ delay: '9m' }),
        }),
        expect.anything()
      );
    });

    it('treats docs without a defaultsVersion as legacy format', async () => {
      mockStored({
        logsExtraction: { ...LEGACY_LOG_EXTRACTION_DEFAULTS, delay: '9m' },
      });

      const state = await client.init();

      expect(state.logsExtraction).toEqual({
        ...LATEST_LOG_EXTRACTION_DEFAULTS,
        delay: '9m',
      });
    });
  });

  describe('update', () => {
    it('throws when no global state exists', async () => {
      mockStored(undefined);

      await expect(client.update({ logsExtraction: { delay: '2m' } })).rejects.toThrow(
        SavedObjectsErrorHelpers.createGenericNotFoundError().message
      );
      expect(soClient.update).not.toHaveBeenCalled();
    });

    it('merges the partial over the existing state and persists only overrides', async () => {
      mockStored({ logsExtraction: { delay: '9m', lookbackPeriod: '6h' } });

      const state = await client.update({ logsExtraction: { frequency: '5m' } });

      expect(soClient.update).toHaveBeenCalledWith(
        EntityStoreGlobalStateTypeName,
        soId,
        expect.objectContaining({
          logsExtraction: { delay: '9m', lookbackPeriod: '6h', frequency: '5m' },
        }),
        expect.objectContaining({ mergeAttributes: false })
      );
      expect(state.logsExtraction).toEqual({
        ...LATEST_LOG_EXTRACTION_DEFAULTS,
        delay: '9m',
        lookbackPeriod: '6h',
        frequency: '5m',
      });
    });

    it('preserves an explicitly-set value even when it equals the current default', async () => {
      mockStored({ logsExtraction: { delay: '9m' } });

      // '1m' is the default delay, but explicitly setting it pins it as an override so that
      // a future default change does not silently affect this store
      const state = await client.update({
        logsExtraction: { delay: LATEST_LOG_EXTRACTION_DEFAULTS.delay },
      });

      expect(soClient.update).toHaveBeenCalledWith(
        EntityStoreGlobalStateTypeName,
        soId,
        expect.objectContaining({ logsExtraction: { delay: '1m' } }),
        expect.objectContaining({ mergeAttributes: false })
      );
      expect(state.logsExtraction.delay).toBe(LATEST_LOG_EXTRACTION_DEFAULTS.delay);
    });

    it('stamps the overrides format on every write', async () => {
      mockStored({ defaultsVersion: 'legacy', logsExtraction: {} });

      await client.update({});

      expect(soClient.update).toHaveBeenCalledWith(
        EntityStoreGlobalStateTypeName,
        soId,
        expect.objectContaining({ defaultsVersion: 'latest' }),
        expect.anything()
      );
    });

    it('writes against the version it read, for optimistic concurrency', async () => {
      mockStored({ logsExtraction: { delay: '9m' } }, 'WzEsMV0=');

      await client.update({ logsExtraction: { frequency: '5m' } });

      expect(soClient.update).toHaveBeenCalledWith(
        EntityStoreGlobalStateTypeName,
        soId,
        expect.anything(),
        expect.objectContaining({ version: 'WzEsMV0=', mergeAttributes: false })
      );
    });

    it('retries the whole read-modify-write on version conflict', async () => {
      mockStored({ logsExtraction: { delay: '9m' } });
      soClient.update.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createConflictError(EntityStoreGlobalStateTypeName, soId)
      );

      const state = await client.update({ logsExtraction: { frequency: '5m' } });

      expect(soClient.find).toHaveBeenCalledTimes(2);
      expect(soClient.update).toHaveBeenCalledTimes(2);
      expect(state.logsExtraction.frequency).toBe('5m');
    });

    it('rejects with the conflict error when retries are exhausted', async () => {
      mockStored({ logsExtraction: { delay: '9m' } });
      soClient.update.mockRejectedValue(
        SavedObjectsErrorHelpers.createConflictError(EntityStoreGlobalStateTypeName, soId)
      );

      await expect(
        client.update({ logsExtraction: { frequency: '5m' } }, { retries: 2, minTimeout: 0 })
      ).rejects.toThrow('conflict');
    });
  });
});
