/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Counter, Meter } from '@opentelemetry/api';
import { metrics, ValueType } from '@opentelemetry/api';
import pMap from 'p-map';

import type { Logger } from '@kbn/core/server';
import type {
  CoreSecurityDelegateServiceAccounts,
  ResolvedServiceAccountWorkload,
} from '@kbn/core-security-server';
import type { AuditServiceSetup } from '@kbn/security-plugin-types-server';

import type {
  SweptWorkloadBinding,
  WorkloadBindingStore,
  WorkloadBindingVerification,
} from './workload_binding_store';
import type { ServiceAccountAuditReason } from '../../audit';
import { ServiceAccountAuditAction, serviceAccountAuditEvent } from '../../audit';
import { getDetailedErrorMessage } from '../../errors';
import { BINDING_CLOCK_SKEW_TOLERANCE_MS } from '../credentials';
import type { ServiceAccountFacts, ServiceAccountsBackend } from '../types';

/** Scope of the meter that records what the stale binding cleanup does. */
export const STALE_BINDING_REAPER_METER_NAME = 'kibana.security.service_accounts';

/** Why a binding is stale. The first that applies wins, in this order. */
export type StaleBindingReason = ServiceAccountAuditReason;

/**
 * What a run carries over to the next one. Task Manager stores it with the task.
 *
 * `sweep` is the pass over every binding that is in progress. Its `cutoff` is fixed when the pass
 * starts, so bindings made since then wait for the next pass instead of keeping this one from
 * ending. `afterKey` is the binding key of the last binding of the last page that was fully
 * processed.
 *
 * `firstSeenUnregistered` maps a workload type, as `JSON.stringify([pluginId, workloadType])`, to
 * when a run first found a binding of that type with no plugin registering it.
 */
export interface StaleBindingReaperState {
  sweep?: { cutoff: string; afterKey?: string };
  firstSeenUnregistered: Record<string, string>;
}

export interface StaleBindingReaperLimits {
  /** Most bindings a run reads. */
  scanBudget: number;
  /** Bindings read per page. */
  pageSize: number;
  /** How long a run keeps starting work before it stops and saves its progress. */
  timeBudgetMs: number;
  /**
   * How long one account lookup, verification read or key write may take. A call that runs out
   * leaves its binding as it is, so one stuck call cannot hold up the rest of its page.
   */
  callTimeoutMs: number;
  /** How many lookups, checks and deletes run at once. */
  concurrency: number;
}

export const DEFAULT_STALE_BINDING_REAPER_LIMITS: StaleBindingReaperLimits = {
  scanBudget: 1000,
  pageSize: 100,
  timeBudgetMs: 2 * 60 * 1000,
  callTimeoutMs: 10 * 1000,
  concurrency: 10,
};

export interface StaleBindingReaperOptions {
  logger: Logger;
  store: Pick<
    WorkloadBindingStore,
    'findPageForSweep' | 'findUnkeyedPage' | 'setBindingKey' | 'verifyUnchanged' | 'delete'
  >;
  backend: Pick<ServiceAccountsBackend, 'getAccountFactsAsInternalUser'>;
  workloadTypes: CoreSecurityDelegateServiceAccounts;
  audit: Pick<AuditServiceSetup, 'withoutRequest'>;
  gracePeriodMs: number;
  unregisteredTypeGracePeriodMs: number;
  dryRun: boolean;
  limits?: Partial<StaleBindingReaperLimits>;
  now?: () => number;
  meter?: Meter;
}

interface ReaperMetrics {
  reaped: Counter;
  retained: Counter;
  accountLookupUnknown: Counter;
}

const createReaperMetrics = (meter: Meter): ReaperMetrics => ({
  reaped: meter.createCounter('kibana.security.service_accounts.workload_bindings.reaped', {
    description: 'Number of stale service account workload bindings removed by the cleanup task.',
    unit: '{binding}',
    valueType: ValueType.INT,
  }),
  retained: meter.createCounter('kibana.security.service_accounts.workload_bindings.retained', {
    description:
      'Number of workload bindings the cleanup task found stale but kept, because the binding failed integrity verification, changed since it was read, or could not be read again.',
    unit: '{binding}',
    valueType: ValueType.INT,
  }),
  accountLookupUnknown: meter.createCounter(
    'kibana.security.service_accounts.workload_bindings.account_lookup.unknown',
    {
      description:
        'Number of service account lookups by the cleanup task that failed, and so said nothing about the account.',
      unit: '{lookup}',
      valueType: ValueType.INT,
    }
  ),
});

/** A signal that aborts once any of the given ones does. */
const anySignal = (signals: AbortSignal[]): { signal: AbortSignal; dispose: () => void } => {
  const controller = new AbortController();
  const listeners = signals.map((signal) => {
    const onAbort = () => controller.abort(signal.reason);
    if (signal.aborted) {
      onAbort();
    } else {
      signal.addEventListener('abort', onAbort, { once: true });
    }
    return () => signal.removeEventListener('abort', onAbort);
  });
  return { signal: controller.signal, dispose: () => listeners.forEach((remove) => remove()) };
};

/** A signal that aborts after `ms`. */
const timeoutSignal = (ms: number): { signal: AbortSignal; dispose: () => void } => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`Timed out after ${ms}ms.`)), ms);
  return { signal: controller.signal, dispose: () => clearTimeout(timer) };
};

/** Thrown, and caught by the run, when the run stops before it finished a page. */
const INTERRUPTED_ERROR_NAME = 'StaleBindingReaperInterrupted';
const interrupted = (): Error =>
  Object.assign(new Error('The stale binding cleanup was interrupted.'), {
    name: INTERRUPTED_ERROR_NAME,
  });
const isInterrupted = (error: unknown): boolean =>
  error instanceof Error && error.name === INTERRUPTED_ERROR_NAME;

/**
 * Waits for `promise`, unless `signal` aborts first. The work behind the promise is not stopped,
 * only waited for, so this is for reads.
 */
const raceSignal = async <T>(promise: Promise<T>, signal: AbortSignal): Promise<T> => {
  if (signal.aborted) {
    throw interrupted();
  }
  let onAbort: (() => void) | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        onAbort = () => reject(interrupted());
        signal.addEventListener('abort', onAbort, { once: true });
      }),
    ]);
  } finally {
    if (onAbort) {
      signal.removeEventListener('abort', onAbort);
    }
  }
};

/** What {@link StaleBindingReaper.callWithTimeout} resolves to. */
type CallResult<T> = { timedOut: true } | { timedOut: false; value: T };

const typeKey = ({ pluginId, workloadType }: SweptWorkloadBinding): string =>
  JSON.stringify([pluginId, workloadType]);

/** Reads a key written by {@link typeKey}. Returns `undefined` for one that is not. */
const parseTypeKey = (key: string): [pluginId: string, workloadType: string] | undefined => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(key);
  } catch {
    return undefined;
  }
  return Array.isArray(parsed) &&
    parsed.length === 2 &&
    typeof parsed[0] === 'string' &&
    typeof parsed[1] === 'string'
    ? [parsed[0], parsed[1]]
    : undefined;
};

/** Totals for one run, for its summary log line. */
interface RunCounts {
  scanned: number;
  reaped: Partial<Record<StaleBindingReason, number>>;
}

/**
 * Finds and removes workload bindings that can never be used again. See
 * {@link StaleBindingReaper.run}.
 */
export class StaleBindingReaper {
  private readonly logger: Logger;
  private readonly store: StaleBindingReaperOptions['store'];
  private readonly backend: StaleBindingReaperOptions['backend'];
  private readonly workloadTypes: CoreSecurityDelegateServiceAccounts;
  private readonly audit: StaleBindingReaperOptions['audit'];
  private readonly gracePeriodMs: number;
  private readonly unregisteredTypeGracePeriodMs: number;
  private readonly dryRun: boolean;
  private readonly limits: StaleBindingReaperLimits;
  private readonly now: () => number;
  private readonly metrics: ReaperMetrics;

  constructor({
    logger,
    store,
    backend,
    workloadTypes,
    audit,
    gracePeriodMs,
    unregisteredTypeGracePeriodMs,
    dryRun,
    limits = {},
    now = Date.now,
    meter = metrics.getMeter(STALE_BINDING_REAPER_METER_NAME),
  }: StaleBindingReaperOptions) {
    this.logger = logger;
    this.store = store;
    this.backend = backend;
    this.workloadTypes = workloadTypes;
    this.audit = audit;
    this.gracePeriodMs = gracePeriodMs;
    this.unregisteredTypeGracePeriodMs = unregisteredTypeGracePeriodMs;
    this.dryRun = dryRun;
    this.limits = { ...DEFAULT_STALE_BINDING_REAPER_LIMITS, ...limits };
    this.now = now;
    this.metrics = createReaperMetrics(meter);
  }

  /**
   * Runs one bounded slice of the sweep over every binding, and returns the state for the next run.
   *
   * A run stops starting work once it has read `scanBudget` bindings, once `timeBudgetMs` has
   * passed, or once `taskSignal` aborts, and then returns its progress. Deletes already sent are
   * waited for. A page cut short is read again in full by the next run, which is safe because a
   * binding is only removed after it is read again and found unchanged.
   *
   * If Task Manager cancels the run, it throws the returned state away, and the next run starts
   * again from the last state it saved.
   */
  async run(
    state: StaleBindingReaperState,
    taskSignal: AbortSignal
  ): Promise<StaleBindingReaperState> {
    const deadline = timeoutSignal(this.limits.timeBudgetMs);
    const work = anySignal([taskSignal, deadline.signal]);
    const counts: RunCounts = { scanned: 0, reaped: {} };

    // Cleared first, before any binding is read, so a node where the type is registered resets
    // the clock even when the run never reaches a binding of that type.
    const firstSeenUnregistered = Object.fromEntries(
      Object.entries(state.firstSeenUnregistered).filter(([key]) => {
        const type = parseTypeKey(key);
        return (
          type !== undefined && !this.isRegistered({ pluginId: type[0], workloadType: type[1] })
        );
      })
    );

    let sweep = state.sweep ?? {
      cutoff: new Date(this.now() - this.gracePeriodMs).toISOString(),
    };

    try {
      const accounts = new Map<string, ServiceAccountFacts>();

      // Bindings an older node wrote during an upgrade have no binding key, so the sweep cannot
      // reach them. Each run gives one page of them their key, which the next pass then reads.
      // Writing the key also takes them out of this query, so every run gets further through them.
      const unkeyed = await raceSignal(
        this.store.findUnkeyedPage({ cutoff: sweep.cutoff, size: this.limits.pageSize }),
        work.signal
      );
      if (unkeyed.length > 0) {
        counts.scanned += unkeyed.length;
        await this.backfillKeys(unkeyed, work.signal);
      }

      while (counts.scanned < this.limits.scanBudget) {
        const size = Math.min(this.limits.pageSize, this.limits.scanBudget - counts.scanned);
        const page = await raceSignal(
          this.store.findPageForSweep({ cutoff: sweep.cutoff, afterKey: sweep.afterKey, size }),
          work.signal
        );

        if (page.length > 0) {
          await this.processPage(page, { accounts, firstSeenUnregistered, counts }, work.signal);
          counts.scanned += page.length;
          sweep = { ...sweep, afterKey: page[page.length - 1].bindingKey };
        }

        if (page.length < size) {
          this.logger.info(
            `Finished a pass over service account workload bindings made before [${sweep.cutoff}]${
              this.dryRun ? ' (dry run)' : ''
            }.`
          );
          return { firstSeenUnregistered };
        }
      }
    } catch (e) {
      if (!isInterrupted(e)) {
        throw e;
      }
      this.logger.debug(
        `Stopped the stale binding cleanup after ${counts.scanned} binding(s): ${
          taskSignal.aborted ? 'the task was cancelled' : 'the run reached its time budget'
        }.`
      );
    } finally {
      deadline.dispose();
      work.dispose();
      this.logSummary(counts);
    }

    return { sweep, firstSeenUnregistered };
  }

  /**
   * Decides which bindings of a page are stale, then reads each of those again and removes it if it
   * is unchanged. Throws an interrupted error when `signal` aborts before the page is
   * fully processed, so the caller does not move past it.
   */
  private async processPage(
    page: SweptWorkloadBinding[],
    {
      accounts,
      firstSeenUnregistered,
      counts,
    }: {
      accounts: Map<string, ServiceAccountFacts>;
      firstSeenUnregistered: Record<string, string>;
      counts: RunCounts;
    },
    signal: AbortSignal
  ): Promise<void> {
    await this.lookUpAccounts(page, accounts, signal);

    const registered = page.filter((binding) => this.isRegistered(binding));
    for (const binding of page) {
      if (!this.isRegistered(binding)) {
        firstSeenUnregistered[typeKey(binding)] ??= new Date(this.now()).toISOString();
      }
    }

    const resolved = new Map<SweptWorkloadBinding, ResolvedServiceAccountWorkload>();
    if (registered.length > 0) {
      const results = await this.workloadTypes.resolveBoundWorkloads(registered, {
        signal,
        purpose: 'cleanup',
      });
      registered.forEach((binding, index) => resolved.set(binding, results[index]));
    }
    // An abort turns every unanswered workload into `unknown`, which would make this page look
    // complete without having been checked.
    if (signal.aborted) {
      throw interrupted();
    }

    const candidates = page.flatMap((binding) => {
      const reason = this.getReason(binding, {
        account: accounts.get(binding.serviceAccountId),
        workload: resolved.get(binding),
        firstSeenUnregistered: firstSeenUnregistered[typeKey(binding)],
      });
      return reason ? [{ binding, reason }] : [];
    });

    await pMap(
      candidates,
      async ({ binding, reason }) => {
        if (signal.aborted) {
          return;
        }
        const removed = await this.reap(binding, reason, signal);
        if (removed) {
          counts.reaped[reason] = (counts.reaped[reason] ?? 0) + 1;
        }
      },
      { concurrency: this.limits.concurrency }
    );

    if (signal.aborted) {
      throw interrupted();
    }
  }

  /** Looks up each account of the page that this run has not looked up yet. */
  private async lookUpAccounts(
    page: SweptWorkloadBinding[],
    accounts: Map<string, ServiceAccountFacts>,
    signal: AbortSignal
  ): Promise<void> {
    const ids = [...new Set(page.map(({ serviceAccountId }) => serviceAccountId))].filter(
      (id) => !accounts.has(id)
    );

    await pMap(
      ids,
      async (id) => {
        const result = await this.callWithTimeout(
          (callSignal) => this.backend.getAccountFactsAsInternalUser(id, { signal: callSignal }),
          signal
        ).catch((e): CallResult<ServiceAccountFacts> => {
          // The run is stopping. Anything else is a failed lookup, which says nothing.
          if (isInterrupted(e)) {
            throw e;
          }
          return { timedOut: true };
        });
        const facts: ServiceAccountFacts = result.timedOut ? { status: 'unknown' } : result.value;
        if (facts.status === 'unknown') {
          this.metrics.accountLookupUnknown.add(1);
        }
        accounts.set(id, facts);
      },
      { concurrency: this.limits.concurrency }
    );
  }

  /**
   * Why the binding is stale, or `undefined` when nothing shows that it is. Each reason needs its
   * own evidence, so a lookup that failed only rules out the reasons that depend on it.
   */
  private getReason(
    { boundAt }: SweptWorkloadBinding,
    {
      account,
      workload,
      firstSeenUnregistered,
    }: {
      account: ServiceAccountFacts | undefined;
      workload: ResolvedServiceAccountWorkload | undefined;
      firstSeenUnregistered: string | undefined;
    }
  ): StaleBindingReason | undefined {
    if (account?.status === 'missing') {
      return 'service_account_missing';
    }

    // Created after the bind means the binding was made for an earlier account with the same ID.
    // The exchange refuses it for good. A timestamp that does not parse is no evidence either way.
    if (account?.status === 'present' && account.credentialCreatedAt !== undefined) {
      const createdAt = Date.parse(account.credentialCreatedAt);
      const bound = Date.parse(boundAt);
      if (
        Number.isFinite(createdAt) &&
        Number.isFinite(bound) &&
        createdAt > bound + BINDING_CLOCK_SKEW_TOLERANCE_MS
      ) {
        return 'service_account_recreated';
      }
    }

    if (workload?.status === 'missing') {
      return 'workload_missing';
    }

    if (
      firstSeenUnregistered !== undefined &&
      this.now() - Date.parse(firstSeenUnregistered) > this.unregisteredTypeGracePeriodMs
    ) {
      return 'workload_type_unregistered';
    }

    return undefined;
  }

  /**
   * Reads the binding again and removes it if it is unchanged. Returns whether it was removed, or
   * would have been in a dry run.
   */
  private async reap(
    binding: SweptWorkloadBinding,
    reason: StaleBindingReason,
    signal: AbortSignal
  ): Promise<boolean> {
    const { pluginId, workloadType, workloadId, spaceId, serviceAccountId } = binding;
    const coordinates = { pluginId, workloadType, workloadId, spaceId };
    const label = `[${pluginId}/${workloadType}/${workloadId}] in space [${spaceId}]`;

    let verification: WorkloadBindingVerification | 'unverified';
    try {
      const result = await this.callWithTimeout(
        () => this.store.verifyUnchanged(coordinates, binding),
        signal
      );
      if (result.timedOut) {
        this.logger.warn(
          `Unable to check the binding of workload ${label} again: timed out after ${this.limits.callTimeoutMs}ms`
        );
      }
      verification = result.timedOut ? 'unverified' : result.value;
    } catch (e) {
      if (isInterrupted(e)) {
        return false;
      }
      this.logger.warn(
        `Unable to check the binding of workload ${label} again: ${getDetailedErrorMessage(e)}`
      );
      verification = 'unverified';
    }

    if (verification === 'absent') {
      this.logger.debug(`The binding of workload ${label} is already gone`);
      return false;
    }
    if (verification !== 'verified') {
      this.metrics.retained.add(1, {
        'kibana.service_account.binding_cleanup.reason': reason,
        'kibana.service_account.binding_cleanup.retained_cause': verification,
      });
      this.logger.debug(`Kept the binding of workload ${label}: ${verification}`);
      return false;
    }

    if (this.dryRun) {
      this.metrics.reaped.add(1, {
        'kibana.service_account.binding_cleanup.reason': reason,
        'kibana.service_account.binding_cleanup.dry_run': true,
      });
      this.logger.info(
        `Would remove the binding of workload ${label} to service account [${serviceAccountId}] (dry run): ${reason}`
      );
      return true;
    }

    // Once verified, the delete goes ahead unless the run already stopped. A rebind between the
    // check and the delete loses its binding. That fails closed: the workload runs as nothing
    // until it is bound again.
    if (signal.aborted) {
      return false;
    }

    let deleted: boolean;
    try {
      deleted = await this.store.delete(coordinates);
    } catch (e) {
      this.logger.warn(
        `Unable to remove the stale binding of workload ${label}: ${getDetailedErrorMessage(e)}`
      );
      return false;
    }
    if (!deleted) {
      this.logger.debug(`The binding of workload ${label} is already gone`);
      return false;
    }

    this.audit.withoutRequest.log(
      serviceAccountAuditEvent({
        action: ServiceAccountAuditAction.WORKLOAD_UNBIND,
        serviceAccount: { id: serviceAccountId },
        workload: { plugin_id: pluginId, type: workloadType, id: workloadId },
        spaceId,
        reason,
      })
    );
    this.metrics.reaped.add(1, {
      'kibana.service_account.binding_cleanup.reason': reason,
      'kibana.service_account.binding_cleanup.dry_run': false,
    });
    this.logger.info(
      `Removed the stale binding of workload ${label} to service account [${serviceAccountId}]: ${reason}`
    );
    return true;
  }

  /**
   * Gives one page of unkeyed bindings their key. A binding whose write fails or runs out of time
   * stays unkeyed, and a later run tries it again.
   */
  private async backfillKeys(bindings: SweptWorkloadBinding[], signal: AbortSignal): Promise<void> {
    let written = 0;
    await pMap(
      bindings,
      async ({ pluginId, workloadType, workloadId, spaceId }) => {
        const label = `[${pluginId}/${workloadType}/${workloadId}] in space [${spaceId}]`;
        try {
          const result = await this.callWithTimeout(
            () => this.store.setBindingKey({ pluginId, workloadType, workloadId, spaceId }),
            signal
          );
          if (!result.timedOut && result.value) {
            written++;
          }
        } catch (e) {
          if (isInterrupted(e)) {
            throw e;
          }
          this.logger.warn(
            `Unable to add a binding key to the binding of workload ${label}: ${getDetailedErrorMessage(
              e
            )}`
          );
        }
      },
      { concurrency: this.limits.concurrency }
    );
    this.logger.debug(
      `Added a binding key to ${written} of ${bindings.length} unkeyed binding(s).`
    );
  }

  /**
   * Runs one call with its own time limit. Resolves `{ timedOut: true }` when that limit runs out,
   * and throws an interrupted error when `signal` aborts first, so the caller can tell a stuck
   * call from a run that is stopping. The call itself is not stopped unless it uses the signal it
   * is given.
   */
  private async callWithTimeout<T>(
    call: (callSignal: AbortSignal) => Promise<T>,
    signal: AbortSignal
  ): Promise<CallResult<T>> {
    const timeout = timeoutSignal(this.limits.callTimeoutMs);
    const callSignal = anySignal([signal, timeout.signal]);
    try {
      return {
        timedOut: false,
        value: await raceSignal(call(callSignal.signal), callSignal.signal),
      };
    } catch (e) {
      if (isInterrupted(e) && !signal.aborted && timeout.signal.aborted) {
        return { timedOut: true };
      }
      throw e;
    } finally {
      timeout.dispose();
      callSignal.dispose();
    }
  }

  private isRegistered({
    pluginId,
    workloadType,
  }: Pick<SweptWorkloadBinding, 'pluginId' | 'workloadType'>): boolean {
    return this.workloadTypes.getWorkloadTypeName(pluginId, workloadType) !== undefined;
  }

  private logSummary({ scanned, reaped }: RunCounts): void {
    const total = Object.values(reaped).reduce((sum, count) => sum + (count ?? 0), 0);
    const byReason = Object.entries(reaped)
      .map(([reason, count]) => `${reason}=${count}`)
      .join(', ');
    this.logger.debug(
      `Stale binding cleanup read ${scanned} binding(s) and ${
        this.dryRun ? 'would have removed' : 'removed'
      } ${total}${byReason ? ` (${byReason})` : ''}.`
    );
  }
}
