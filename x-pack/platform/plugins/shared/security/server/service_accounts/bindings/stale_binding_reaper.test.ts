/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meter } from '@opentelemetry/api';

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type {
  ResolvedServiceAccountWorkload,
  ServiceAccountBoundWorkloadRef,
} from '@kbn/core-security-server';
import { securityServiceMock } from '@kbn/core-security-server-mocks';
import type { MockedLogger } from '@kbn/logging-mocks';

import type { WorkloadBindingCoordinates } from './binding_saved_object';
import { getWorkloadBindingId } from './binding_saved_object';
import type { StaleBindingReaperState } from './stale_binding_reaper';
import { StaleBindingReaper } from './stale_binding_reaper';
import type { SweptWorkloadBinding, WorkloadBindingVerification } from './workload_binding_store';
import { auditServiceMock } from '../../audit/mocks';
import { BINDING_CLOCK_SKEW_TOLERANCE_MS } from '../credentials';
import type { ServiceAccountFacts } from '../types';

const NOW = Date.parse('2026-10-26T12:00:00.000Z');
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const GRACE = DAY;
const UNREGISTERED_GRACE = 7 * DAY;
const OLD = new Date(NOW - 2 * DAY).toISOString();

interface StoredBinding extends SweptWorkloadBinding {
  integrityFailed?: boolean;
}

const binding = (workloadId: string, overrides: Partial<StoredBinding> = {}): StoredBinding => {
  const coordinates = {
    pluginId: 'workflows',
    workloadType: 'workflow',
    workloadId,
    spaceId: 'default',
    ...overrides,
  };
  return {
    ...coordinates,
    serviceAccountId: 'sa-1',
    boundBy: { type: 'user', username: 'elastic' },
    boundAt: OLD,
    bindingKey: getWorkloadBindingId(coordinates),
    ...overrides,
  };
};

/**
 * Bindings in memory, read the way the real store reads them: by binding key, after the cursor,
 * before the cutoff. Hooks let a test change a binding between the reads the reaper makes.
 */
class InMemoryStore {
  readonly bindings = new Map<string, StoredBinding>();
  readonly deleted: string[] = [];
  beforeVerify?: (coordinates: WorkloadBindingCoordinates) => void | Promise<void>;
  afterVerify?: (coordinates: WorkloadBindingCoordinates) => void;

  add(...bindings: StoredBinding[]) {
    for (const stored of bindings) {
      this.bindings.set(getWorkloadBindingId(stored), stored);
    }
    return this;
  }

  findPageForSweep = jest.fn(
    async ({ cutoff, afterKey, size }: { cutoff: string; afterKey?: string; size: number }) =>
      [...this.bindings.values()]
        .filter(({ bindingKey }) => bindingKey !== undefined)
        .filter(({ boundAt }) => boundAt < cutoff)
        .filter(({ bindingKey }) => afterKey === undefined || (bindingKey ?? '') > afterKey)
        .sort((a, b) => ((a.bindingKey ?? '') < (b.bindingKey ?? '') ? -1 : 1))
        .slice(0, size)
        .map(({ integrityFailed, ...rest }) => rest)
  );

  findUnkeyedPage = jest.fn(async ({ cutoff, size }: { cutoff: string; size: number }) =>
    [...this.bindings.values()]
      .filter(({ bindingKey, boundAt }) => bindingKey === undefined && boundAt < cutoff)
      .slice(0, size)
      .map(({ integrityFailed, ...rest }) => rest)
  );

  verifyUnchanged = jest.fn(
    async (
      coordinates: WorkloadBindingCoordinates,
      expected: Pick<SweptWorkloadBinding, 'serviceAccountId' | 'boundAt'>
    ): Promise<WorkloadBindingVerification> => {
      await this.beforeVerify?.(coordinates);
      const stored = this.bindings.get(getWorkloadBindingId(coordinates));
      let result: WorkloadBindingVerification;
      if (!stored) {
        result = 'absent';
      } else if (stored.integrityFailed) {
        result = 'integrity_failed';
      } else {
        result =
          stored.serviceAccountId === expected.serviceAccountId &&
          stored.boundAt === expected.boundAt
            ? 'verified'
            : 'changed';
      }
      this.afterVerify?.(coordinates);
      return result;
    }
  );

  setBindingKey = jest.fn(async (coordinates: WorkloadBindingCoordinates) => {
    const stored = this.bindings.get(getWorkloadBindingId(coordinates));
    if (stored) {
      stored.bindingKey = getWorkloadBindingId(coordinates);
    }
    return stored !== undefined;
  });

  delete = jest.fn(async (coordinates: WorkloadBindingCoordinates) => {
    const id = getWorkloadBindingId(coordinates);
    const existed = this.bindings.delete(id);
    if (existed) {
      this.deleted.push(coordinates.workloadId);
    }
    return existed;
  });
}

/** A meter whose counters record into jest mocks, keyed by metric name. */
const createMeterMock = () => {
  const counters = new Map<string, { add: jest.Mock }>();
  const meter = {
    createCounter: jest.fn((name: string) => {
      const counter = { add: jest.fn() };
      counters.set(name, counter);
      return counter;
    }),
  };
  const added = (name: string) =>
    counters.get(`kibana.security.service_accounts.workload_bindings.${name}`)?.add.mock.calls ??
    [];
  return { meter: meter as unknown as Meter, added };
};

const EMPTY_STATE: StaleBindingReaperState = { firstSeenUnregistered: {} };
const WORKFLOW_TYPE_KEY = JSON.stringify(['workflows', 'workflow']);

describe('StaleBindingReaper', () => {
  let store: InMemoryStore;
  let accounts: Map<string, ServiceAccountFacts>;
  let workloads: Map<string, ResolvedServiceAccountWorkload>;
  let registeredTypes: Set<string>;
  let backend: { getAccountFactsAsInternalUser: jest.Mock };
  let workloadTypes: ReturnType<typeof securityServiceMock.createDelegateHandle>['serviceAccounts'];
  let audit: ReturnType<typeof auditServiceMock.create>;
  let logger: MockedLogger;
  let meterMock: ReturnType<typeof createMeterMock>;
  let now: number;

  const createReaper = (
    overrides: Partial<ConstructorParameters<typeof StaleBindingReaper>[0]> = {}
  ) =>
    new StaleBindingReaper({
      logger,
      store,
      backend,
      workloadTypes,
      audit,
      gracePeriodMs: GRACE,
      unregisteredTypeGracePeriodMs: UNREGISTERED_GRACE,
      dryRun: false,
      now: () => now,
      meter: meterMock.meter,
      ...overrides,
    });

  const run = (state: StaleBindingReaperState = EMPTY_STATE, signal?: AbortSignal) =>
    createReaper().run(state, signal ?? new AbortController().signal);

  const auditedUnbinds = () =>
    jest.mocked(audit.withoutRequest.log).mock.calls.map(([event]) => ({
      message: event?.message,
      workload: event?.kibana?.workload?.id,
      spaceId: event?.kibana?.space_id,
      account: event?.user?.target?.id,
    }));

  beforeEach(() => {
    now = NOW;
    store = new InMemoryStore();
    accounts = new Map();
    workloads = new Map();
    registeredTypes = new Set([WORKFLOW_TYPE_KEY]);
    backend = {
      getAccountFactsAsInternalUser: jest.fn(
        async (id: string): Promise<ServiceAccountFacts> =>
          accounts.get(id) ?? { status: 'present' }
      ),
    };
    workloadTypes = securityServiceMock.createDelegateHandle().serviceAccounts;
    workloadTypes.getWorkloadTypeName.mockImplementation((pluginId, workloadType) =>
      registeredTypes.has(JSON.stringify([pluginId, workloadType])) ? 'Type' : undefined
    );
    workloadTypes.resolveBoundWorkloads.mockImplementation(
      async (bindings: ReadonlyArray<ServiceAccountBoundWorkloadRef>) =>
        bindings.map(
          ({ workloadId }) => workloads.get(workloadId) ?? { status: 'present' as const }
        )
    );
    audit = auditServiceMock.create();
    logger = loggingSystemMock.createLogger();
    meterMock = createMeterMock();
  });

  describe('decision table', () => {
    it('removes a binding whose service account is gone', async () => {
      store.add(binding('w-1', { serviceAccountId: 'gone' }), binding('w-2'));
      accounts.set('gone', { status: 'missing' });

      await run();

      expect(store.deleted).toEqual(['w-1']);
      expect(auditedUnbinds()).toEqual([
        {
          message:
            'Kibana has unbound service account [id=gone] from workload [workflows/workflow/w-1], because the service account no longer exists',
          workload: 'w-1',
          spaceId: 'default',
          account: 'gone',
        },
      ]);
      expect(meterMock.added('reaped')).toEqual([
        [
          1,
          {
            'kibana.service_account.binding_cleanup.reason': 'service_account_missing',
            'kibana.service_account.binding_cleanup.dry_run': false,
          },
        ],
      ]);
    });

    it('removes only the bindings made before an account was created again with the same ID', async () => {
      const createdAt = NOW - 3 * DAY;
      store.add(
        binding('earlier', { boundAt: new Date(createdAt - HOUR).toISOString() }),
        binding('later', { boundAt: new Date(createdAt + HOUR).toISOString() }),
        binding('within-skew', {
          boundAt: new Date(createdAt - BINDING_CLOCK_SKEW_TOLERANCE_MS).toISOString(),
        })
      );
      accounts.set('sa-1', {
        status: 'present',
        credentialCreatedAt: new Date(createdAt).toISOString(),
      });

      await run();

      expect(store.deleted).toEqual(['earlier']);
      expect(auditedUnbinds()[0].message).toContain(
        'because the service account was deleted and created again since the bind'
      );
      // Looked up once, and compared with each binding's own bind time.
      expect(backend.getAccountFactsAsInternalUser).toHaveBeenCalledTimes(1);
    });

    it('keeps a binding when a timestamp does not parse', async () => {
      store.add(binding('w-1'));
      accounts.set('sa-1', { status: 'present', credentialCreatedAt: 'not a date' });

      await run();

      expect(store.deleted).toEqual([]);
    });

    it('removes a binding whose workload its type reports missing', async () => {
      store.add(binding('gone'), binding('here'));
      workloads.set('gone', { status: 'missing' });

      await run();

      expect(store.deleted).toEqual(['gone']);
      expect(workloadTypes.resolveBoundWorkloads).toHaveBeenCalledWith(expect.any(Array), {
        signal: expect.any(AbortSignal),
        purpose: 'cleanup',
      });
    });

    it('starts the clock for an unregistered type, and removes its bindings once it runs out', async () => {
      registeredTypes.clear();
      store.add(binding('w-1'));

      const first = await run();
      expect(store.deleted).toEqual([]);
      expect(first.firstSeenUnregistered).toEqual({
        [WORKFLOW_TYPE_KEY]: new Date(NOW).toISOString(),
      });
      expect(workloadTypes.resolveBoundWorkloads).not.toHaveBeenCalled();

      now = NOW + UNREGISTERED_GRACE;
      await run(first);
      expect(store.deleted).toEqual([]);

      now = NOW + UNREGISTERED_GRACE + 1;
      await run(first);
      expect(store.deleted).toEqual(['w-1']);
      expect(auditedUnbinds()[0].message).toContain(
        'because no plugin registers the workload type any more'
      );
    });

    it('names the account reason first when several apply', async () => {
      store.add(binding('w-1', { serviceAccountId: 'gone' }));
      accounts.set('gone', { status: 'missing' });
      workloads.set('w-1', { status: 'missing' });

      await run();

      expect(meterMock.added('reaped')[0][1]).toMatchObject({
        'kibana.service_account.binding_cleanup.reason': 'service_account_missing',
      });
    });

    it('still removes a missing workload when its account could not be looked up', async () => {
      store.add(binding('w-1'));
      accounts.set('sa-1', { status: 'unknown' });
      workloads.set('w-1', { status: 'missing' });

      await run();

      expect(store.deleted).toEqual(['w-1']);
      expect(meterMock.added('account_lookup.unknown')).toEqual([[1]]);
    });

    it('still removes a binding of a gone account when its workload could not be checked', async () => {
      store.add(binding('w-1'));
      accounts.set('sa-1', { status: 'missing' });
      workloads.set('w-1', { status: 'unknown' });

      await run();

      expect(store.deleted).toEqual(['w-1']);
    });

    it('keeps a binding when nothing shows it is stale', async () => {
      store.add(binding('w-1'), binding('w-2'));
      accounts.set('sa-1', { status: 'unknown' });
      workloads.set('w-1', { status: 'unknown' });

      await run();

      expect(store.deleted).toEqual([]);
      expect(store.verifyUnchanged).not.toHaveBeenCalled();
      expect(audit.withoutRequest.log).not.toHaveBeenCalled();
    });
  });

  it('only reads bindings made before the grace period', async () => {
    await run();

    expect(store.findPageForSweep).toHaveBeenCalledWith({
      cutoff: new Date(NOW - GRACE).toISOString(),
      afterKey: undefined,
      size: 100,
    });
    expect(store.findUnkeyedPage).toHaveBeenCalledWith({
      cutoff: new Date(NOW - GRACE).toISOString(),
      size: 100,
    });
  });

  describe('bindings without a binding key', () => {
    const unkeyed = (workloadId: string, overrides: Partial<StoredBinding> = {}) => ({
      ...binding(workloadId, overrides),
      bindingKey: undefined,
    });

    it('gives them their key, so the sweep reads them in the same run', async () => {
      store.add(unkeyed('unkeyed', { serviceAccountId: 'gone' }));
      accounts.set('gone', { status: 'missing' });

      await run();

      expect(store.setBindingKey).toHaveBeenCalledTimes(1);
      expect(store.deleted).toEqual(['unkeyed']);
    });

    it('gets through more than a page of them, even when the first page is all live', async () => {
      store.add(...Array.from({ length: 100 }, (_, index) => unkeyed(`live-${index}`)));
      store.add(unkeyed('stale', { serviceAccountId: 'gone' }));
      accounts.set('gone', { status: 'missing' });

      let state = await run();
      expect(store.deleted).toEqual([]);
      state = await run(state);
      await run(state);

      expect(store.deleted).toEqual(['stale']);
      expect([...store.bindings.values()].every(({ bindingKey }) => bindingKey)).toBe(true);
    });

    it('leaves a binding unkeyed when its write fails, and goes on with the rest', async () => {
      store.add(unkeyed('w-1'), unkeyed('w-2'));
      store.setBindingKey.mockRejectedValueOnce(new Error('unavailable'));

      await run();

      expect(
        [...store.bindings.values()].filter(({ bindingKey }) => bindingKey === undefined)
      ).toHaveLength(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unable to add a binding key to the binding of workload')
      );
    });
  });

  it('clears the clock of a type that is registered again, before reading any binding', async () => {
    const otherKey = JSON.stringify(['other', 'job']);

    const state = await run({
      firstSeenUnregistered: {
        [WORKFLOW_TYPE_KEY]: new Date(NOW - 30 * DAY).toISOString(),
        [otherKey]: new Date(NOW - DAY).toISOString(),
        'not json': new Date(NOW).toISOString(),
      },
    });

    expect(state.firstSeenUnregistered).toEqual({ [otherKey]: new Date(NOW - DAY).toISOString() });
  });

  describe('sweep', () => {
    const addMany = (count: number) =>
      store.add(...Array.from({ length: count }, (_, index) => binding(`w-${index}`)));

    const resolvedIds = () =>
      workloadTypes.resolveBoundWorkloads.mock.calls.flatMap(([bindings]) =>
        bindings.map(({ workloadId }) => workloadId)
      );

    it('reads at most the scan budget per run, and resumes after the last page it finished', async () => {
      // All made at the same time, so only the binding key orders them.
      addMany(1500);

      const first = await run();
      expect(resolvedIds()).toHaveLength(1000);
      expect(first.sweep).toEqual({
        cutoff: new Date(NOW - GRACE).toISOString(),
        afterKey: expect.any(String),
      });

      const second = await run(first);
      expect(second.sweep).toBeUndefined();
      expect(resolvedIds()).toHaveLength(1500);
      expect(new Set(resolvedIds()).size).toBe(1500);
      expect(logger.info).toHaveBeenCalledWith(
        `Finished a pass over service account workload bindings made before [${new Date(
          NOW - GRACE
        ).toISOString()}].`
      );
    });

    it('keeps the cutoff of a pass in progress, and leaves bindings made since to the next pass', async () => {
      addMany(1500);
      const first = await run();

      // Made after the first cutoff, and old enough for the second run's own cutoff.
      now = NOW + 2 * DAY;
      store.add(binding('late', { boundAt: new Date(NOW).toISOString() }));
      workloads.set('late', { status: 'missing' });

      const second = await run(first);
      expect(second.sweep).toBeUndefined();
      expect(store.deleted).toEqual([]);

      const third = await run(second);
      expect(third.sweep).toBeDefined();
      expect(store.deleted).toEqual(['late']);
    });

    describe('when the run reaches its time budget', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('stops, returns its progress, and reads the unfinished page again next time', async () => {
        addMany(300);
        let calls = 0;
        workloadTypes.resolveBoundWorkloads.mockImplementation(async (bindings, options) => {
          calls++;
          if (calls === 3) {
            // Hangs until the run's signal aborts.
            await new Promise((resolve) =>
              options?.signal?.addEventListener('abort', resolve, { once: true })
            );
            return bindings.map(() => ({ status: 'unknown' as const }));
          }
          return bindings.map(() => ({ status: 'present' as const }));
        });

        const pending = createReaper().run(EMPTY_STATE, new AbortController().signal);
        await jest.advanceTimersByTimeAsync(2 * 60 * 1000);
        const state = await pending;

        const pages = workloadTypes.resolveBoundWorkloads.mock.calls.map(([bindings]) => bindings);
        expect(state.sweep?.afterKey).toBe(getWorkloadBindingId(pages[1][pages[1].length - 1]));
        expect(jest.getTimerCount()).toBe(0);

        await createReaper().run(state, new AbortController().signal);
        const replayed = workloadTypes.resolveBoundWorkloads.mock.calls[3][0];
        expect(replayed).toEqual(pages[2]);
      });

      it('keeps a binding whose second read hangs, and finishes its page', async () => {
        // One binding per page, so the hung read and the stale binding after it are on different
        // pages.
        store.add(binding('first'), binding('second'));
        workloads.set('first', { status: 'missing' });
        workloads.set('second', { status: 'missing' });
        let verifies = 0;
        store.beforeVerify = () => (++verifies === 1 ? new Promise(() => {}) : undefined);

        const pending = createReaper({ limits: { pageSize: 1 } }).run(
          EMPTY_STATE,
          new AbortController().signal
        );
        await jest.advanceTimersByTimeAsync(10 * 1000);
        const state = await pending;

        expect(store.deleted).toHaveLength(1);
        expect(state.sweep).toBeUndefined();
        expect(meterMock.added('retained')).toEqual([
          [
            1,
            {
              'kibana.service_account.binding_cleanup.reason': 'workload_missing',
              'kibana.service_account.binding_cleanup.retained_cause': 'unverified',
            },
          ],
        ]);
      });

      it('gives up on an account lookup that hangs, and treats the account as unknown', async () => {
        store.add(binding('w-1'));
        workloads.set('w-1', { status: 'missing' });
        backend.getAccountFactsAsInternalUser.mockImplementation(() => new Promise(() => {}));

        const pending = createReaper().run(EMPTY_STATE, new AbortController().signal);
        await jest.advanceTimersByTimeAsync(10 * 1000);
        await pending;

        expect(meterMock.added('account_lookup.unknown')).toEqual([[1]]);
        expect(store.deleted).toEqual(['w-1']);
      });
    });
  });

  describe('signals', () => {
    it('starts no delete request once the task is cancelled', async () => {
      store.add(binding('w-1'), binding('w-2'));
      workloads.set('w-1', { status: 'missing' });
      workloads.set('w-2', { status: 'missing' });
      const controller = new AbortController();
      store.beforeVerify = () => controller.abort();

      const state = await createReaper().run(EMPTY_STATE, controller.signal);

      expect(store.delete).not.toHaveBeenCalled();
      // The page did not finish, so the next run reads it again.
      expect(state.sweep?.afterKey).toBeUndefined();
    });

    it('waits for a delete it already sent', async () => {
      store.add(binding('w-1'));
      workloads.set('w-1', { status: 'missing' });
      const controller = new AbortController();
      store.delete.mockImplementationOnce(async (coordinates) => {
        controller.abort();
        const id = getWorkloadBindingId(coordinates);
        store.bindings.delete(id);
        store.deleted.push(coordinates.workloadId);
        return true;
      });

      await createReaper().run(EMPTY_STATE, controller.signal);

      expect(store.deleted).toEqual(['w-1']);
      expect(audit.withoutRequest.log).toHaveBeenCalledTimes(1);
    });

    it('removes each binding once when a cancelled run overlaps its replacement', async () => {
      store.add(...Array.from({ length: 50 }, (_, index) => binding(`w-${index}`)));
      for (let index = 0; index < 50; index++) {
        workloads.set(`w-${index}`, { status: 'missing' });
      }
      const cancelled = new AbortController();
      let verifies = 0;
      store.beforeVerify = () => {
        if (++verifies === 20) {
          cancelled.abort();
        }
      };

      await Promise.all([
        createReaper().run(EMPTY_STATE, cancelled.signal),
        createReaper().run(EMPTY_STATE, new AbortController().signal),
      ]);

      expect(store.deleted).toHaveLength(50);
      expect(new Set(store.deleted).size).toBe(50);
      expect(audit.withoutRequest.log).toHaveBeenCalledTimes(50);
    });
  });

  describe('dry run', () => {
    it('checks each binding the same way, and removes nothing', async () => {
      store.add(
        binding('stale'),
        { ...binding('tampered'), integrityFailed: true },
        binding('rebound')
      );
      for (const id of ['stale', 'tampered', 'rebound']) {
        workloads.set(id, { status: 'missing' });
      }
      store.beforeVerify = ({ workloadId }) => {
        if (workloadId === 'rebound') {
          store.add(binding('rebound', { serviceAccountId: 'sa-2' }));
        }
      };

      await createReaper({ dryRun: true }).run(EMPTY_STATE, new AbortController().signal);

      expect(store.verifyUnchanged).toHaveBeenCalledTimes(3);
      expect(store.delete).not.toHaveBeenCalled();
      expect(audit.withoutRequest.log).not.toHaveBeenCalled();
      expect(meterMock.added('reaped')).toEqual([
        [
          1,
          {
            'kibana.service_account.binding_cleanup.reason': 'workload_missing',
            'kibana.service_account.binding_cleanup.dry_run': true,
          },
        ],
      ]);
      expect(meterMock.added('retained').map(([, attributes]) => attributes)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            'kibana.service_account.binding_cleanup.retained_cause': 'integrity_failed',
          }),
          expect.objectContaining({
            'kibana.service_account.binding_cleanup.retained_cause': 'changed',
          }),
        ])
      );
    });
  });

  describe('verification', () => {
    beforeEach(() => {
      store.add(binding('w-1'));
      workloads.set('w-1', { status: 'missing' });
    });

    it('keeps a binding that fails integrity verification', async () => {
      store.add({ ...binding('w-1'), integrityFailed: true });

      await run();

      expect(store.deleted).toEqual([]);
      expect(meterMock.added('retained')).toEqual([
        [
          1,
          {
            'kibana.service_account.binding_cleanup.reason': 'workload_missing',
            'kibana.service_account.binding_cleanup.retained_cause': 'integrity_failed',
          },
        ],
      ]);
    });

    it('keeps a binding rebound before it is checked again', async () => {
      store.beforeVerify = () => {
        store.add(binding('w-1', { serviceAccountId: 'sa-2' }));
      };

      await run();

      expect(store.deleted).toEqual([]);
      expect(store.bindings.get(getWorkloadBindingId(binding('w-1')))?.serviceAccountId).toBe(
        'sa-2'
      );
    });

    it('loses a binding rebound between the check and the delete, which fails closed', async () => {
      store.afterVerify = () => store.add(binding('w-1', { serviceAccountId: 'sa-2' }));

      await run();

      // The accepted gap: a saved object delete cannot be made conditional on the version read.
      expect(store.deleted).toEqual(['w-1']);
    });

    it('does not count or audit a binding that is already gone', async () => {
      store.beforeVerify = () => store.bindings.clear();

      await run();

      expect(audit.withoutRequest.log).not.toHaveBeenCalled();
      expect(meterMock.added('reaped')).toEqual([]);
      expect(meterMock.added('retained')).toEqual([]);
    });

    it('moves on when a check or a delete fails', async () => {
      store.add(binding('w-2'));
      workloads.set('w-2', { status: 'missing' });
      store.verifyUnchanged.mockRejectedValueOnce(new Error('unavailable'));

      const state = await run();

      expect(store.deleted).toHaveLength(1);
      expect(meterMock.added('retained')).toEqual([
        [
          1,
          {
            'kibana.service_account.binding_cleanup.reason': 'workload_missing',
            'kibana.service_account.binding_cleanup.retained_cause': 'unverified',
          },
        ],
      ]);
      expect(state.sweep).toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unable to check the binding of workload')
      );
    });
  });
});
