/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { LifecycleTransform } from './index';
import { CAI_LIFECYCLE_INDEX_VERSION } from './constants';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildEsClient({
  indexExists = false,
  transformExists = false,
  transformVersion = CAI_LIFECYCLE_INDEX_VERSION,
  transformState = 'stopped' as string,
  lastCheckpoint = 0,
}: {
  indexExists?: boolean;
  transformExists?: boolean;
  transformVersion?: number | undefined;
  transformState?: string;
  lastCheckpoint?: number;
} = {}): jest.Mocked<ElasticsearchClient> {
  const meta = transformVersion !== undefined ? { version: transformVersion } : {};

  return {
    indices: {
      exists: jest.fn().mockResolvedValue(indexExists),
      create: jest.fn().mockResolvedValue({ acknowledged: true }),
    },
    transform: {
      getTransform: transformExists
        ? jest.fn().mockResolvedValue({ transforms: [{ _meta: meta }] })
        : jest.fn().mockRejectedValue(Object.assign(new Error('Not found'), { statusCode: 404 })),
      putTransform: jest.fn().mockResolvedValue({ acknowledged: true }),
      stopTransform: jest.fn().mockResolvedValue({ acknowledged: true }),
      deleteTransform: jest.fn().mockResolvedValue({ acknowledged: true }),
      startTransform: jest.fn().mockResolvedValue({ acknowledged: true }),
      getTransformStats: jest.fn().mockResolvedValue({
        transforms: [
          {
            state: transformState,
            checkpointing: { last: { checkpoint: lastCheckpoint } },
          },
        ],
      }),
    },
  } as unknown as jest.Mocked<ElasticsearchClient>;
}

function buildLogger(): jest.Mocked<Logger> {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as jest.Mocked<Logger>;
}

function buildTransform(
  esClient: jest.Mocked<ElasticsearchClient>,
  { isServerless = false } = {}
) {
  return new LifecycleTransform({
    esClient,
    logger: buildLogger(),
    isServerless,
    spaceId: 'default',
    owner: 'securitySolution',
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('LifecycleTransform.upsert()', () => {
  // ── Happy path ─────────────────────────────────────────────────────────

  describe('first-time setup (index and transform do not exist)', () => {
    it('creates the destination index', async () => {
      const esClient = buildEsClient({ indexExists: false, transformExists: false });
      await buildTransform(esClient).upsert();

      expect(esClient.indices.create).toHaveBeenCalledTimes(1);
    });

    it('creates the transform', async () => {
      const esClient = buildEsClient({ indexExists: false, transformExists: false });
      await buildTransform(esClient).upsert();

      expect(esClient.transform.putTransform).toHaveBeenCalledTimes(1);
    });

    it('starts the transform from epoch when no previous checkpoint exists', async () => {
      const esClient = buildEsClient({
        indexExists: false,
        transformExists: false,
        lastCheckpoint: 0,
      });
      await buildTransform(esClient).upsert();

      expect(esClient.transform.startTransform).toHaveBeenCalledWith(
        expect.objectContaining({ from: '1970-01-01T00:00:00Z' })
      );
    });

    it('starts the transform WITHOUT a from-epoch param when a previous checkpoint exists', async () => {
      const esClient = buildEsClient({
        indexExists: true,
        transformExists: true,
        transformVersion: CAI_LIFECYCLE_INDEX_VERSION,
        transformState: 'stopped',
        lastCheckpoint: 5,
      });
      await buildTransform(esClient).upsert();

      const startCall = (esClient.transform.startTransform as jest.Mock).mock.calls[0][0];
      expect(startCall).not.toHaveProperty('from');
    });

    it('omits number_of_shards settings when running serverless', async () => {
      const esClient = buildEsClient({ indexExists: false, transformExists: false });
      await buildTransform(esClient, { isServerless: true }).upsert();

      const createCall = (esClient.indices.create as jest.Mock).mock.calls[0][0];
      expect(createCall.settings?.index).not.toHaveProperty('number_of_shards');
      expect(createCall.settings?.index).not.toHaveProperty('auto_expand_replicas');
    });
  });

  // ── Already-current state ───────────────────────────────────────────────

  describe('when index and transform already exist at the current version', () => {
    it('skips index creation', async () => {
      const esClient = buildEsClient({
        indexExists: true,
        transformExists: true,
        transformVersion: CAI_LIFECYCLE_INDEX_VERSION,
        transformState: 'started',
      });
      await buildTransform(esClient).upsert();

      expect(esClient.indices.create).not.toHaveBeenCalled();
    });

    it('skips putTransform', async () => {
      const esClient = buildEsClient({
        indexExists: true,
        transformExists: true,
        transformVersion: CAI_LIFECYCLE_INDEX_VERSION,
        transformState: 'started',
      });
      await buildTransform(esClient).upsert();

      expect(esClient.transform.putTransform).not.toHaveBeenCalled();
    });

    it('skips startTransform when transform is already running', async () => {
      const esClient = buildEsClient({
        indexExists: true,
        transformExists: true,
        transformVersion: CAI_LIFECYCLE_INDEX_VERSION,
        transformState: 'started',
      });
      await buildTransform(esClient).upsert();

      expect(esClient.transform.startTransform).not.toHaveBeenCalled();
    });

    it('skips startTransform when transform is indexing', async () => {
      const esClient = buildEsClient({
        indexExists: true,
        transformExists: true,
        transformVersion: CAI_LIFECYCLE_INDEX_VERSION,
        transformState: 'indexing',
      });
      await buildTransform(esClient).upsert();

      expect(esClient.transform.startTransform).not.toHaveBeenCalled();
    });
  });

  // ── Version mismatch ────────────────────────────────────────────────────

  describe('version mismatch — stop, delete, recreate', () => {
    it('stops the existing transform before deleting', async () => {
      const esClient = buildEsClient({
        indexExists: true,
        transformExists: true,
        transformVersion: 0, // stale version
        transformState: 'stopped',
      });
      await buildTransform(esClient).upsert();

      expect(esClient.transform.stopTransform).toHaveBeenCalledWith(
        expect.objectContaining({ force: true, wait_for_completion: true })
      );
    });

    it('deletes the stale transform after stopping', async () => {
      const esClient = buildEsClient({
        indexExists: true,
        transformExists: true,
        transformVersion: 0,
        transformState: 'stopped',
      });
      await buildTransform(esClient).upsert();

      // stopTransform must happen before deleteTransform
      const stopOrder = (esClient.transform.stopTransform as jest.Mock).mock.invocationCallOrder[0];
      const deleteOrder = (esClient.transform.deleteTransform as jest.Mock).mock
        .invocationCallOrder[0];
      expect(stopOrder).toBeLessThan(deleteOrder);
      expect(esClient.transform.deleteTransform).toHaveBeenCalledTimes(1);
    });

    it('creates a new transform after the old one is deleted', async () => {
      const esClient = buildEsClient({
        indexExists: true,
        transformExists: true,
        transformVersion: 0,
        transformState: 'stopped',
      });
      await buildTransform(esClient).upsert();

      expect(esClient.transform.putTransform).toHaveBeenCalledTimes(1);
    });
  });

  // ── Race condition — concurrent index creation ──────────────────────────

  describe('concurrent index creation (Race 1)', () => {
    /**
     * FAILURE SCENARIO: Two Kibana nodes both see indexExists = false and race
     * to create the index. The second node's create call gets
     * resource_already_exists_exception.
     * Expected: error is swallowed and upsert continues normally.
     */
    it('swallows resource_already_exists_exception from concurrent create', async () => {
      const esClient = buildEsClient({ indexExists: false, transformExists: false });
      (esClient.indices.create as jest.Mock).mockRejectedValue(
        Object.assign(new Error('Race'), {
          body: { error: { type: 'resource_already_exists_exception' } },
        })
      );

      // Should not throw
      await expect(buildTransform(esClient).upsert()).resolves.toBeUndefined();
    });

    it('re-throws index creation errors other than resource_already_exists', async () => {
      const esClient = buildEsClient({ indexExists: false, transformExists: false });
      (esClient.indices.create as jest.Mock).mockRejectedValue(
        Object.assign(new Error('ClusterBlock'), {
          body: { error: { type: 'cluster_block_exception' } },
        })
      );

      // The outer upsert() wraps errors in logger.error + swallows — so check
      // that the inner method propagates to the catch block in upsert().
      // We verify via the logger mock rather than expecting a throw.
      const logger = buildLogger();
      const transform = new LifecycleTransform({
        esClient,
        logger,
        isServerless: false,
        spaceId: 'default',
        owner: 'securitySolution',
      });
      await transform.upsert();

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to upsert lifecycle transform'),
        expect.objectContaining({ error: expect.any(Error) })
      );
    });
  });

  // ── Race condition — concurrent transform creation ──────────────────────

  describe('concurrent transform creation (Race 2)', () => {
    /**
     * FAILURE SCENARIO: Two Kibana nodes both call putTransform for the same
     * transform. ES raises version_conflict_engine_exception for the second.
     * Expected: error is swallowed; upsert continues to startTransform.
     */
    it('swallows version_conflict_engine_exception from concurrent putTransform', async () => {
      const esClient = buildEsClient({ indexExists: true, transformExists: false });
      (esClient.transform.putTransform as jest.Mock).mockRejectedValue(
        Object.assign(new Error('Race'), {
          body: { error: { type: 'version_conflict_engine_exception' } },
        })
      );

      await expect(buildTransform(esClient).upsert()).resolves.toBeUndefined();
    });

    it('swallows resource_already_exists_exception from concurrent putTransform', async () => {
      const esClient = buildEsClient({ indexExists: true, transformExists: false });
      (esClient.transform.putTransform as jest.Mock).mockRejectedValue(
        Object.assign(new Error('Race'), {
          body: { error: { type: 'resource_already_exists_exception' } },
        })
      );

      await expect(buildTransform(esClient).upsert()).resolves.toBeUndefined();
    });
  });

  // ── Race condition — concurrent transform start ─────────────────────────

  describe('concurrent transform start', () => {
    /**
     * FAILURE SCENARIO: Two Kibana nodes both see the transform as stopped
     * and race to start it. The second gets status_exception.
     * Expected: error is swallowed; upsert returns normally.
     */
    it('swallows status_exception from concurrent startTransform', async () => {
      const esClient = buildEsClient({
        indexExists: true,
        transformExists: true,
        transformVersion: CAI_LIFECYCLE_INDEX_VERSION,
        transformState: 'stopped',
      });
      (esClient.transform.startTransform as jest.Mock).mockRejectedValue(
        Object.assign(new Error('Race'), {
          body: { error: { type: 'status_exception' } },
        })
      );

      await expect(buildTransform(esClient).upsert()).resolves.toBeUndefined();
    });
  });

  // ── getStoredTransformVersion fallback ──────────────────────────────────

  describe('getStoredTransformVersion — error handling', () => {
    it('treats a non-404 getTransform error as version=undefined (triggers recreate)', async () => {
      // transform.getTransform returns a non-404 error when checking version
      const esClient = buildEsClient({ indexExists: true, transformExists: false });
      // Override: transformExists=false sets getTransform to 404, but we want
      // it to exist so the version-check branch is reached, then fail with 500.
      // We need getTransform to: (1st call — existence check) return 404,
      // then when we actually test a transform with version undefined we
      // test the fallback directly via a separate scenario.
      //
      // Scenario: transform exists but getTransform for version check throws non-404.
      // We simulate: exists=true (first getTransform call succeeds), then a second
      // call for version retrieval throws 500.
      let callCount = 0;
      (esClient.transform.getTransform as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // existence check — succeeds with no _meta (simulates unknown version)
          return Promise.resolve({ transforms: [{ _meta: undefined }] });
        }
        // version fetch — throw non-404
        return Promise.reject(Object.assign(new Error('InternalError'), { statusCode: 500 }));
      });

      // With undefined version the transform will be recreated
      await buildTransform(esClient).upsert();

      expect(esClient.transform.stopTransform).toHaveBeenCalled();
      expect(esClient.transform.putTransform).toHaveBeenCalled();
    });
  });
});
