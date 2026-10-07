/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TestElasticsearchUtils, TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { setupTestServers } from './lib';
import { bulkMarkApiKeysForInvalidation } from '../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import { API_KEY_PENDING_INVALIDATION_TYPE } from '../saved_objects';

// Locks in the encryption-on-write contract for `api_key_pending_invalidation`
// SOs. The bug fixed in PR #254211's follow-up was that the UIAM provisioning
// task built its writer via `createInternalRepository`, which has no
// extensions; the resulting SOs persisted `apiKeyId` / `uiamApiKey` as
// plaintext, and the alerting invalidation task then failed to decrypt them
// with "Invalid initialization vector". This suite proves:
//   1. Writes via `getUnsafeInternalClient` are encrypted at rest in ES.
//   2. Writes via `createInternalRepository` are *not* — so any future
//      regression that routes pending-invalidation writes through that factory
//      will fail this test.
describe('api_key_pending_invalidation encryption-on-write', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let esClient: ElasticsearchClient;
  let unsafeInternalClient: SavedObjectsClientContract;
  let plainInternalClient: SavedObjectsClientContract;
  const logger = loggingSystemMock.createLogger();

  // Encrypts a base64(id:value) string and persists an
  // `api_key_pending_invalidation` SO via the supplied client; returns the
  // raw `_source` from ES so the test can inspect what actually landed in
  // the index (post-encryption-extension).
  const persistAndReadRaw = async (
    client: SavedObjectsClientContract,
    encodedKey: string
  ): Promise<{
    apiKeyId: string;
    uiamApiKey?: string;
    _docId: string;
  }> => {
    await bulkMarkApiKeysForInvalidation({ apiKeys: [encodedKey] }, logger, client);

    const search = await esClient.search<{
      type: string;
      api_key_pending_invalidation: { apiKeyId: string; uiamApiKey?: string };
    }>({
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
      query: { term: { type: API_KEY_PENDING_INVALIDATION_TYPE } },
      sort: [{ updated_at: { order: 'desc' } }],
      size: 1,
    });
    const hit = search.hits.hits[0];
    expect(hit).toBeDefined();
    const source = hit._source!;
    return {
      apiKeyId: source.api_key_pending_invalidation.apiKeyId,
      uiamApiKey: source.api_key_pending_invalidation.uiamApiKey,
      _docId: hit._id!,
    };
  };

  const cleanPendingInvalidations = async () => {
    await esClient.deleteByQuery({
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
      query: { term: { type: API_KEY_PENDING_INVALIDATION_TYPE } },
      refresh: true,
      conflicts: 'proceed',
    });
  };

  beforeAll(async () => {
    const setupResult = await setupTestServers({
      xpack: {
        encryptedSavedObjects: {
          // Any 32+ char value works; this key only exists for the duration
          // of the test process.
          encryptionKey: 'a'.repeat(32),
        },
      },
    });
    esServer = setupResult.esServer;
    kibanaServer = setupResult.kibanaServer;

    esClient = kibanaServer.coreStart.elasticsearch.client.asInternalUser;

    // ESO encryption extension ships with `getUnsafeInternalClient` (and the
    // request-scoped client), but not with `createInternalRepository`.
    unsafeInternalClient = kibanaServer.coreStart.savedObjects.getUnsafeInternalClient({
      includedHiddenTypes: [API_KEY_PENDING_INVALIDATION_TYPE],
    });
    plainInternalClient = kibanaServer.coreStart.savedObjects.createInternalRepository([
      API_KEY_PENDING_INVALIDATION_TYPE,
    ]);
  });

  afterAll(async () => {
    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  beforeEach(async () => {
    await cleanPendingInvalidations();
  });

  it('encrypts apiKeyId and uiamApiKey when written via getUnsafeInternalClient (UIAM key)', async () => {
    const apiKeyId = 'uiam-key-id-123';
    const uiamSecret = 'essu_uiam-secret-value';
    const encodedKey = Buffer.from(`${apiKeyId}:${uiamSecret}`).toString('base64');

    const raw = await persistAndReadRaw(unsafeInternalClient, encodedKey);

    // ESO replaces the field with a base64 encrypted blob; never the literal
    // input. The exact format is opaque, but it must not be the plaintext id
    // and must be substantially longer than the input.
    expect(raw.apiKeyId).not.toBe(apiKeyId);
    expect(raw.apiKeyId.length).toBeGreaterThan(apiKeyId.length);
    expect(raw.uiamApiKey).toBeDefined();
    expect(raw.uiamApiKey).not.toBe(uiamSecret);
    expect(raw.uiamApiKey!.length).toBeGreaterThan(uiamSecret.length);
  });

  it('encrypts apiKeyId when written via getUnsafeInternalClient (ES-only key)', async () => {
    const apiKeyId = 'es-key-id-abc';
    const esSecret = 'plain-es-secret';
    const encodedKey = Buffer.from(`${apiKeyId}:${esSecret}`).toString('base64');

    const raw = await persistAndReadRaw(unsafeInternalClient, encodedKey);

    expect(raw.apiKeyId).not.toBe(apiKeyId);
    expect(raw.apiKeyId.length).toBeGreaterThan(apiKeyId.length);
    // No uiamApiKey is written for non-UIAM credentials, so it must be absent.
    expect(raw.uiamApiKey).toBeUndefined();
  });

  it('persists apiKeyId / uiamApiKey AS PLAINTEXT when written via createInternalRepository (regression contract)', async () => {
    // This is the path that caused the production bug. The assertion is
    // intentionally inverted: it documents that `createInternalRepository`
    // is unsafe for encrypted SO types, so the producer of these SOs must
    // never be wired to it. If a future change makes
    // `createInternalRepository` apply the encryption extension, this test
    // will fail and the bug fix's wiring rationale should be revisited.
    const apiKeyId = 'plaintext-leak-id';
    const uiamSecret = 'essu_plaintext-leak-secret';
    const encodedKey = Buffer.from(`${apiKeyId}:${uiamSecret}`).toString('base64');

    const raw = await persistAndReadRaw(plainInternalClient, encodedKey);

    expect(raw.apiKeyId).toBe(apiKeyId);
    expect(raw.uiamApiKey).toBe(uiamSecret);
  });
});
