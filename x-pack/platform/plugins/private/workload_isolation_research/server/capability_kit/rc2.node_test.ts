/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* Regressions for the Grok 0.2.0-rc.1 review (P1-1..P1-4 and P2 items). */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { Client, errors } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { ExecutionHost } from './host';
import { ModuleRegistry } from './registry';
import { bindSavedObjects } from './services';
import { bindService } from './bind_service';
import { bindSyncOperations } from './sync_operations';
import { createLocalSavedObjects } from './local_saved_objects';
import type { LocalSoCapability } from './local_saved_objects';
import { registrations } from './so_registration_example';
import { encode, decode } from './codecs';
import type { Binding } from './host';
import type { Bundle, WorkerContext } from './protocol';

const specifier = require.resolve('./example_tasks');
const registry = (): ModuleRegistry => {
  const value = new ModuleRegistry(new Set([specifier]));
  for (const name of [
    'services',
    'orderedThenReturn',
    'sniffCoResident',
    'hold',
    'spin',
    'abortProbeStarted',
    'slowSync',
  ])
    value.register(name, specifier, name);
  return value;
};
const base = { principal: 'alice', space: 'space-a', deadlineMs: 10000 };

void test('P1-1 main SO bridge: option ALLOWLIST rejects initialNamespaces and unknown keys', async () => {
  const calls: string[] = [];
  const client = {
    create: async () => (calls.push('create'), { id: 'x' }),
    find: async () => (calls.push('find'), { saved_objects: [] }),
    get: async () => (calls.push('get'), { id: 'x' }),
  } as unknown as SavedObjectsClientContract;
  const binding = bindSavedObjects(client, { principal: 'alice', space: 'space-a' });
  const bundle = { principal: 'alice', space: 'space-a' } as Bundle;
  for (const [operation, args] of [
    ['create', { type: 't', attributes: {}, options: { initialNamespaces: ['*'] } }],
    ['create', { type: 't', attributes: {}, options: { initialNamespaces: ['space-b'] } }],
    ['find', { options: { type: 't', typeToNamespacesMap: { t: ['*'] } } }],
    ['get', { type: 't', id: '1', options: { unknownOverride: true } }],
  ] as const)
    await assert.rejects(binding.handler(operation, args, bundle), /not permitted|space/);
  assert.deepEqual(calls, []);
  await binding.handler(
    'create',
    { type: 't', attributes: {}, options: { id: 'x', overwrite: true, refresh: 'wait_for' } },
    bundle
  );
  await binding.handler('find', { options: { type: 't', perPage: 5, search: 'x' } }, bundle);
  assert.deepEqual(calls, ['create', 'find']);
});

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
const requireModule = createRequire(__filename);
const localContext = (capability: LocalSoCapability): WorkerContext =>
  ({
    bundle: {
      runId: 'rc2',
      principal: capability.principal,
      space: capability.space,
      grants: {},
      data: encode({ savedObjectsLocal: capability }),
    },
    signal: new AbortController().signal,
    load: async (id: string) =>
      id === 'types'
        ? registrations
        : (requireModule(
            resolve(
              __dirname,
              '../../../../shared/encrypted_saved_objects/server/research_eso_bootstrap'
            )
          ).createResearchEsoKernel as object),
  } as unknown as WorkerContext);

void test('P1-1/P1-2 local SO: initialNamespaces denied; ESO mergeAttributes:false and upsert of encrypted/AAD denied', async () => {
  const client = new Client({ node: 'http://127.0.0.1:1', maxRetries: 0 });
  try {
    const so = await createLocalSavedObjects(
      localContext({
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
      }),
      client as never,
      logger
    );
    const type = 'wir_t7p_fixture';
    assert.throws(
      () => so.create(type, { mutable: 'x' }, { initialNamespaces: ['*'] }),
      /not permitted|pinned/
    );
    assert.throws(() => so.find(type, { typeToNamespacesMap: {} }), /not permitted|pinned/);
    assert.throws(
      () => so.update(type, 'one', { mutable: 'x' }, { mergeAttributes: false }),
      /mergeAttributes/
    );
    assert.throws(
      () => so.update(type, 'one', { mutable: 'x' }, { upsert: { secret: 'planted' } }),
      /encrypted\/AAD/
    );
    assert.throws(
      () => so.update(type, 'one', { mutable: 'x' }, { upsert: { stable: 'planted' } }),
      /encrypted\/AAD/
    );
    // Permitted shapes still reach the repository (fixture ES is unreachable -> connection error).
    await assert.rejects(
      so.update(type, 'one', { mutable: 'x' }, { upsert: { mutable: 'x' }, refresh: 'wait_for' }),
      (error: Error) => !/encrypted|AAD|permitted|mergeAttributes/.test(error.message)
    );
  } finally {
    await client.close();
  }
});

void test('P2 ES diagnostic keeps x-elastic-* / x-found-* response headers by prefix', () => {
  const error = new errors.ResponseError({
    body: { status: 429 },
    statusCode: 429,
    headers: { 'x-elastic-new-thing': 'a', 'x-found-handling-zone': 'b', 'x-secret': 'no' },
    warnings: null,
    meta: {
      context: null,
      name: 'n',
      request: { params: { method: 'GET', path: '/' }, options: {}, id: 1 },
      connection: null,
      attempts: 0,
      aborted: false,
    },
  });
  const back = decode(encode(error)) as InstanceType<typeof errors.ResponseError>;
  assert.equal(back.headers?.['x-elastic-new-thing'], 'a');
  assert.equal(back.headers?.['x-found-handling-zone'], 'b');
  assert.equal(back.headers?.['x-secret'], undefined);
});

void test('P2 bindService requires an explicit lever', () => {
  assert.throws(() => bindService({}, { operations: [] } as never), /lever/);
  assert.equal(
    bindService({}, { operations: [], lever: 'owner_refactor' }).lever,
    'owner_refactor'
  );
});

for (const transport of ['thread', 'process'] as const) {
  void test(
    transport + ': P1-3 ordered binding starts no host work after the run ended',
    async () => {
      const host = new ExecutionHost(registry(), { transport });
      const started: number[] = [];
      const ordered: Binding = {
        lever: 'capability_bundle',
        ordered: true,
        handler: async (_operation, args) => {
          started.push((args as { index: number }).index);
          await new Promise((r) => setTimeout(r, 300));
          return null;
        },
      };
      try {
        const outcome = await host.run({
          ...base,
          workloadClass: 'o',
          moduleId: 'orderedThenReturn',
          input: null,
          capabilities: { ordered },
        });
        assert.equal(outcome.status, 'failure');
        await new Promise((r) => setTimeout(r, 1200));
        assert.deepEqual(started, [0]);
      } finally {
        await host.stop();
      }
    }
  );

  void test(
    transport + ': P1-4 default co-residency keeps different principals apart',
    async () => {
      const host = new ExecutionHost(registry(), {
        transport,
        slotsPerClass: 2,
        concurrencyPerClass: { neg: 4 },
      });
      const victimCalls: Bundle[] = [];
      const fixture: Binding = {
        lever: 'capability_bundle',
        handler: async (operation, args, bundle) => {
          if (operation === 'hold') {
            await new Promise((r) => setTimeout(r, (args as { ms: number }).ms));
            return null;
          }
          victimCalls.push(bundle);
          return null;
        },
      };
      try {
        const attacker = host.run({
          workloadClass: 'neg',
          moduleId: 'sniffCoResident',
          input: { waitMs: 1500 },
          principal: 'mallory',
          space: 'space-m',
          deadlineMs: 10000,
          capabilities: {},
        });
        await new Promise((r) => setTimeout(r, 600));
        const victim = host.run({
          workloadClass: 'neg',
          moduleId: 'hold',
          input: { ms: 1500 },
          principal: 'bob',
          space: 'space-b',
          deadlineMs: 10000,
          data: { elasticsearch: { marker: 'stand-in' } },
          capabilities: { fixture },
        });
        const [attack] = await Promise.all([attacker, victim]);
        assert.equal(attack.status, 'success');
        if (attack.status === 'success')
          assert.deepEqual(attack.value, { sawOtherRun: false, sawCredentialsData: false });
        assert.equal(victimCalls.length, 0);
      } finally {
        await host.stop();
      }
    }
  );

  void test(transport + ': P2 hard-stop and queued outcomes say graceful:false', async () => {
    const host = new ExecutionHost(registry(), { transport, abortGraceMs: 0 });
    try {
      const running = host.run({
        ...base,
        workloadClass: 'g',
        moduleId: 'spin',
        input: null,
        deadlineMs: 1500,
        capabilities: {},
      });
      const queued = host.run({
        ...base,
        workloadClass: 'g',
        moduleId: 'spin',
        input: null,
        deadlineMs: 300,
        capabilities: {},
      });
      const [first, second] = await Promise.all([running, queued]);
      for (const outcome of [first, second]) {
        assert.equal(outcome.status, 'terminated');
        if (outcome.status === 'terminated') assert.equal(outcome.graceful, false);
      }
    } finally {
      await host.stop();
    }
  });
}

void test('P2 callSync wait longer than stallMs (main handler busy) is not a stall', async () => {
  const host = new ExecutionHost(registry(), { transport: 'thread', abortGraceMs: 100 });
  const fixture = bindSyncOperations({
    slow: () => {
      const end = performance.now() + 400;
      while (performance.now() < end) {
        // Main-side synchronous lookup that is slow but bounded.
      }
      return 'ok';
    },
  });
  try {
    const outcome = await host.run({
      ...base,
      workloadClass: 's',
      moduleId: 'slowSync',
      input: null,
      deadlineMs: 10000,
      stallMs: 150,
      capabilities: { fixture },
    });
    assert.equal(outcome.status, 'success');
  } finally {
    await host.stop();
  }
});
