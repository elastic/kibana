/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { Client } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import { createLocalSavedObjects } from './local_saved_objects';
import type { LocalSoCapability } from './local_saved_objects';
import { registrations } from './so_registration_example';
import { encode } from './codecs';
import type { WorkerContext } from './protocol';

const requireModule = createRequire(__filename);
const silent = (): void => {};
const logger: Logger = {
  trace: silent,
  debug: silent,
  info: silent,
  warn: silent,
  error: silent,
  fatal: silent,
  log: silent,
  isLevelEnabled: () => false,
  get: () => logger,
};
const contextFor = (capability: LocalSoCapability): WorkerContext => ({
  bundle: {
    runId: 'fixture',
    principal: 'internal-task',
    space: 'space-a',
    grants: {},
    data: encode({ savedObjectsLocal: capability }),
  },
  signal: new AbortController().signal,
  load: async (id) =>
    id === 'types'
      ? registrations
      : (requireModule(
          resolve(
            __dirname,
            '../../../../shared/encrypted_saved_objects/server/research_eso_bootstrap'
          )
        ).createResearchEsoKernel as object),
  call: async () => {
    throw new Error('Unexpected bridge');
  },
  callSync: () => {
    throw new Error('unused');
  },
  exportCallback: () => {
    throw new Error('unused');
  },
  resolveCallback: () => {
    throw new Error('unused');
  },
  releaseCallback: () => {},
});

void test('real local SO/ESO composes; readiness, identity, registry, scope and unsafe partial updates fail closed', async () => {
  const client = new Client({ node: 'http://127.0.0.1:1', maxRetries: 0 });
  const capability: LocalSoCapability = {
    principal: 'internal-task',
    space: 'space-a',
    mode: 'internal',
    index: 'fixture-index',
    kibanaVersion: '9.5.0',
    registryId: 'types',
    registryRevision: registrations.revision,
    esoFactoryId: 'eso',
    encryptionKey: randomBytes(32).toString('base64url'),
    includedHiddenTypes: ['wir_t7p_fixture'],
    migrationReady: true,
  };
  try {
    for (const patch of [
      { migrationReady: false },
      { principal: 'other' },
      { registryRevision: 'stale' },
      { mode: 'scoped' as const },
    ]) {
      await assert.rejects(
        createLocalSavedObjects(contextFor({ ...capability, ...patch }), client, logger),
        /readiness|Foreign|mismatch|security/
      );
    }
    const so = await createLocalSavedObjects(contextFor(capability), client, logger);
    assert.deepEqual(so.info, { registeredTypes: 1, registryRevision: 'fixture-v2', esoTypes: 1 });
    assert.throws(() => so.get('wir_t7p_fixture', 'one', { namespace: 'space-b' }), /pinned/);
    assert.throws(() => so.update('wir_t7p_fixture', 'one', { stable: 'tampered' }), /AAD/);
    assert.throws(() => so.update('wir_t7p_fixture', 'one', { secret: 'tampered' }), /encrypted/);
    await assert.rejects(so.get('not_granted', 'one'), /not found/i);
  } finally {
    await client.close();
  }
});
