/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { ExecutionHost } from './host';
import { ModuleRegistry } from './registry';
import { bindSavedObjects } from './services';
import type { Binding } from './host';
import type { Bundle } from './protocol';

const specifier = require.resolve('./example_tasks');
const registry = (): ModuleRegistry => {
  const value = new ModuleRegistry(new Set([specifier]));
  for (const name of ['forgeGrant', 'sniffCoResident', 'hold', 'services', 'wrongGrant'])
    value.register(name, specifier, name);
  return value;
};
const whoami = (calls: Bundle[]): Binding => ({
  lever: 'capability_bundle',
  handler: async (operation, args, bundle) => {
    if (operation === 'hold') {
      // The victim's own legitimate call keeps it active; it is not recorded.
      await new Promise((resolve) => setTimeout(resolve, (args as { ms: number }).ms));
      return null;
    }
    calls.push(bundle);
    return { principal: bundle.principal, space: bundle.space };
  },
});

for (const transport of ['thread', 'process'] as const) {
  void test(
    transport + ': forged/absent grants and foreign principal/space scopes fail closed',
    { timeout: 30000 },
    async () => {
      const host = new ExecutionHost(registry(), { transport });
      const calls: Bundle[] = [];
      const base = {
        workloadClass: 'neg',
        principal: 'alice',
        space: 'space-a',
        deadlineMs: 10000,
      };
      try {
        // Capability never granted to this run.
        const ungranted = await host.run({
          ...base,
          moduleId: 'wrongGrant',
          input: null,
          capabilities: {},
        });
        assert.equal(ungranted.status, 'failure');
        // Fabricated grant for a granted capability: handler never runs.
        const forged = await host.run({
          ...base,
          moduleId: 'forgeGrant',
          input: { mode: 'randomGrant' },
          capabilities: { fixture: whoami(calls) },
        });
        assert.equal(forged.status, 'success');
        await new Promise((resolve) => setTimeout(resolve, 100));
        assert.equal(calls.length, 0);
        // SO bridge bound to bob/space-b refuses alice/space-a bundles and namespace overrides.
        const soCalls: string[] = [];
        const client = {
          get: async () => {
            soCalls.push('get');
            return { id: 'one' };
          },
        } as unknown as SavedObjectsClientContract;
        for (const [binding, input] of [
          [bindSavedObjects(client, { principal: 'bob', space: 'space-a' }), {}],
          [bindSavedObjects(client, { principal: 'alice', space: 'space-b' }), {}],
          [
            bindSavedObjects(client, { principal: 'alice', space: 'space-a' }),
            { namespace: 'space-b' },
          ],
        ] as const) {
          const outcome = await host.run({
            ...base,
            moduleId: 'services',
            input,
            capabilities: { savedObjects: binding },
          });
          assert.equal(outcome.status, 'failure');
        }
        assert.deepEqual(soCalls, []);
        const allowed = await host.run({
          ...base,
          moduleId: 'services',
          input: {},
          capabilities: {
            savedObjects: bindSavedObjects(client, { principal: 'alice', space: 'space-a' }),
          },
        });
        assert.equal(allowed.status, 'success');
        assert.deepEqual(soCalls, ['get']);
      } finally {
        await host.stop();
      }
    }
  );

  for (const coResidency of ['any', 'same-principal'] as const) {
    void test(
      transport +
        ': co-resident runs share a trust domain (' +
        coResidency +
        '); same-principal affinity prevents cross-user exposure',
      { timeout: 30000 },
      async () => {
        const host = new ExecutionHost(registry(), {
          transport,
          slotsPerClass: 2,
          concurrencyPerClass: { neg: 4 },
          coResidency,
        });
        const victimCalls: Bundle[] = [];
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
          await new Promise((resolve) => setTimeout(resolve, 600));
          const victim = host.run({
            workloadClass: 'neg',
            moduleId: 'hold',
            input: { ms: 1500 },
            principal: 'bob',
            space: 'space-b',
            deadlineMs: 10000,
            data: { elasticsearch: { marker: 'bob-credential-stand-in' } },
            capabilities: { fixture: whoami(victimCalls) },
          });
          const [attack] = await Promise.all([attacker, victim]);
          assert.equal(attack.status, 'success');
          if (attack.status !== 'success') return;
          const seen = attack.value as { sawOtherRun: boolean; sawCredentialsData: boolean };
          if (coResidency === 'any') {
            // NEGATIVE FINDING (documented): one isolate is one trust domain.
            assert.equal(seen.sawOtherRun, true);
            assert.equal(seen.sawCredentialsData, true);
            assert.equal(victimCalls.length, 1);
            assert.equal(victimCalls[0].principal, 'bob');
          } else {
            assert.deepEqual(seen, { sawOtherRun: false, sawCredentialsData: false });
            assert.equal(victimCalls.length, 0);
          }
        } finally {
          await host.stop();
        }
      }
    );
  }
}
