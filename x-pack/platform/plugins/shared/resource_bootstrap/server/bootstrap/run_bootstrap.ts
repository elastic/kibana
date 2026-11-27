/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { stableStringify } from '@kbn/std';
import type { Logger } from '@kbn/logging';
import {
  MAX_REPORTED_ERRORS,
  MAX_REPORTED_MESSAGE_LENGTH,
  STATUS_API_PATH,
  type BootstrapError,
  type BootstrapStatusAttributes,
  type KindResult,
} from '../../common';
import { applyBootstrap, type BootstrapOutcome } from '../apply/apply_bootstrap';
import { readOwnedState } from '../ownership/owned_state';
import { pruneOwned, type PruneResult } from '../ownership/prune_owned';
import {
  BootstrapReadError,
  getReadLimits,
  readBootstrapFiles,
  type BootstrapInput,
} from '../reader/read_bootstrap_files';
import type { ResourceBootstrapConfig } from '../config';
import type { InternalServices } from '../types';
import { toMessage } from '../to_message';

/**
 * `retryable` when applying the same files again may succeed, `permanent` when it cannot, and
 * `mismatch` when this instance does not see what the instance that asked for the run saw.
 */
export type BootstrapRunResult =
  | { outcome: 'done' }
  | { outcome: 'retryable'; error: Error }
  | { outcome: 'permanent'; error: Error }
  | { outcome: 'mismatch'; reason: string };

/** What an instance sees: the hash of its files, `null` when they cannot all be read, and of its settings. */
export interface RunExpectation {
  filesHash: string | null;
  settingsHash: string;
}

type RunServices = Pick<
  InternalServices,
  'config' | 'ledger' | 'logger' | 'registry' | 'status' | 'spaceExists' | 'kibanaVersion'
> & { requests: Pick<InternalServices['requests'], 'latest'> };

/**
 * Hashes what changes how a run writes, deletes or validates, so changing it applies again: the
 * settings, and the Kibana version, since an upgrade can change which documents the kinds accept.
 */
export const hashSettings = ({
  managed,
  prune,
  kibanaVersion,
}: Pick<ResourceBootstrapConfig, 'managed' | 'prune'> & { kibanaVersion: string }): string =>
  createHash('sha256').update(stableStringify({ managed, prune, kibanaVersion })).digest('hex');

/** Reads what this instance sees, so a run elsewhere can check that it sees the same. */
export const readExpectation = async ({
  config,
  kibanaVersion,
}: Pick<RunServices, 'config' | 'kibanaVersion'>): Promise<RunExpectation> => {
  const { path, managed, prune } = config;
  const settingsHash = hashSettings({ managed, prune, kibanaVersion });
  try {
    const { hash } = await readBootstrapFiles({ path, ...getReadLimits(config) });
    return { filesHash: hash, settingsHash };
  } catch (error) {
    if (error instanceof BootstrapReadError) {
      return { filesHash: error.hash ?? null, settingsHash };
    }
    throw error;
  }
};

const describeMismatch = (expected: RunExpectation, seen: RunExpectation): string | undefined => {
  if (expected.filesHash !== seen.filesHash) {
    return `This instance sees other files (${seen.filesHash}) than the instance that asked for this run (${expected.filesHash})`;
  }
  if (expected.settingsHash !== seen.settingsHash) {
    return 'This instance runs with other settings or another Kibana version than the instance that asked for this run';
  }
  return undefined;
};

/** Whether the last run completed for these files, settings and Kibana version. */
const isApplied = (
  last: BootstrapStatusAttributes | undefined,
  { filesHash, settingsHash }: RunExpectation
): boolean =>
  last?.status === 'completed' && last.hash === filesHash && last.settingsHash === settingsHash;

// Cut, so an error that repeats a large input cannot bloat the logs and the status.
const shortenMessage = (message: string): string =>
  message.length > MAX_REPORTED_MESSAGE_LENGTH
    ? `${message.slice(0, MAX_REPORTED_MESSAGE_LENGTH)}…`
    : message;

// Swallows status write errors so they cannot hide the original failure.
const recordFailure = async (
  { status, logger }: Pick<RunServices, 'status' | 'logger'>,
  {
    hash,
    startedAt,
    finishedRequestNumber,
    revision,
  }: {
    hash: string | null;
    startedAt: string;
    finishedRequestNumber?: number;
    revision?: number;
  },
  problems: string[]
): Promise<void> => {
  await status
    .set({
      hash,
      status: 'failed',
      ...(finishedRequestNumber !== undefined && { finishedRequestNumber }),
      ...(revision !== undefined && { revision }),
      startedAt,
      finishedAt: new Date().toISOString(),
      kinds: {},
      errors: problems.map((message) => ({ message: shortenMessage(message) })),
    })
    .catch((statusError) =>
      logger.warn(`Could not record the failed run: ${toMessage(statusError)}`)
    );
};

const summarize = (
  outcome: BootstrapOutcome,
  pruning: PruneResult
): {
  status: 'completed' | 'failed';
  kinds: Record<string, KindResult>;
  /** The first errors, as the status keeps them. */
  errors: BootstrapError[];
  errorCount: number;
  result: BootstrapRunResult;
} => {
  const kinds = { ...outcome.kinds };
  for (const [kind, pruned] of Object.entries(pruning.pruned)) {
    const existing: KindResult | undefined = kinds[kind];
    kinds[kind] = { ...(existing ?? { applied: 0, failed: 0 }), pruned };
  }
  const allErrors = [...outcome.errors, ...pruning.errors];
  const errors = allErrors
    .slice(0, MAX_REPORTED_ERRORS)
    .map((error) => ({ ...error, message: shortenMessage(error.message) }));
  const errorCount = allErrors.length;
  if (errorCount === 0 && outcome.status === 'completed') {
    return { status: 'completed', kinds, errors, errorCount, result: { outcome: 'done' } };
  }

  const failed = (result: 'retryable' | 'permanent', message: string) => ({
    status: 'failed' as const,
    kinds,
    errors,
    errorCount,
    result: {
      outcome: result,
      error: new Error(`Applying the bootstrap resources failed: ${message}`),
    },
  });
  // Pruning only follows a completed apply, and its errors may go away on a retry.
  const applyRetryable = outcome.status === 'failed' && outcome.retryable;
  if (!applyRetryable && pruning.errors.length === 0) {
    return failed('permanent', `${errorCount} errors that a retry cannot fix`);
  }
  return failed('retryable', `${errorCount} errors`);
};

/** How many errors a failed run logs; the status keeps more. */
export const MAX_LOGGED_ERRORS = 10;

const describeCounts = ({ applied, created, unchanged, failed, pruned }: KindResult): string =>
  [
    `${applied} applied`,
    ...(created ? [`${created} created`] : []),
    ...(unchanged ? [`${unchanged} unchanged`] : []),
    `${failed} failed`,
    ...(pruned ? [`${pruned} pruned`] : []),
  ].join(', ');

const describeError = ({ kind, spaceId, id, message }: BootstrapError): string => {
  const subject = [
    ...(kind !== undefined ? [kind] : []),
    ...(id !== undefined ? [`"${id}"`] : []),
    ...(spaceId !== undefined ? [`in space "${spaceId}"`] : []),
  ].join(' ');
  return subject === '' ? message : `${subject}: ${message}`;
};

// The status API is internal and needs a superuser, so the logs must say what failed.
const logSummary = (
  logger: Logger,
  files: string,
  { status, kinds, errors, errorCount }: ReturnType<typeof summarize>
): void => {
  const counts = Object.entries(kinds).map(
    ([kind, result]) => `${kind}: ${describeCounts(result)}`
  );
  const totals = counts.length > 0 ? counts.join('; ') : 'no resources applied';
  if (status === 'completed') {
    logger.info(`Applied the bootstrap files mounted at ${files}: ${totals}`);
    return;
  }
  const logged = errors.slice(0, MAX_LOGGED_ERRORS);
  const notLogged = errorCount - logged.length;
  logger.warn(
    [
      `Applying the bootstrap files mounted at ${files} failed with ${errorCount} ${
        errorCount === 1 ? 'error' : 'errors'
      }: ${totals}`,
      ...logged.map((error) => `- ${describeError(error)}`),
      ...(notLogged > 0
        ? [`- and ${notLogged} more; ${STATUS_API_PATH} lists the first ${MAX_REPORTED_ERRORS}`]
        : []),
    ].join('\n')
  );
};

/** Applies the mounted files and records the outcome; the caller must hold the bootstrap lock. */
export const runBootstrap = async ({
  requestNumber,
  expected,
  mayDefer,
  services,
  signal,
}: {
  /** The number the start that requested this run took from the requests counter. */
  requestNumber: number;
  /** What the instance that requested this run saw. */
  expected: RunExpectation;
  /** Whether a run that does not see what was expected may leave the request to another instance. */
  mayDefer: boolean;
  services: RunServices;
  signal: AbortSignal;
}): Promise<BootstrapRunResult> => {
  const { config, ledger, logger, registry, requests, status, spaceExists, kibanaVersion } =
    services;
  const { path, managed, prune, reapplyOnStart } = config;
  const startedAt = new Date().toISOString();
  // Read before the files, so every request numbered up to here is covered by what this run applies.
  const coveredRequestNumber = await requests.latest();

  // A later request already ran with what its instance saw, which this older one must not undo, nor
  // replace the outcome of.
  const last = await status.get();
  const finishedRequestNumber = last?.finishedRequestNumber ?? 0;
  const lastRevision = last?.revision;
  // Kept by runs that did not finish their own request, and raised by the ones that did. The
  // revision is kept the same way, and raised by runs that start applying files with a higher one.
  const finished = {
    ...(finishedRequestNumber > 0 && { finishedRequestNumber }),
    ...(lastRevision !== undefined && { revision: lastRevision }),
  };
  const finishedThis = {
    ...finished,
    finishedRequestNumber: Math.max(finishedRequestNumber, requestNumber),
  };
  if (finishedRequestNumber > requestNumber) {
    logger.info(
      `Request ${requestNumber} to apply the bootstrap files is superseded by request ${finishedRequestNumber}, which finished; skipping`
    );
    return { outcome: 'done' };
  }

  let read: { input: BootstrapInput } | { error: BootstrapReadError };
  try {
    read = { input: await readBootstrapFiles({ path, ...getReadLimits(config) }) };
  } catch (error) {
    if (!(error instanceof BootstrapReadError)) {
      await recordFailure(services, { hash: null, startedAt, ...finished }, [toMessage(error)]);
      throw error;
    }
    read = { error };
  }
  const filesHash = 'input' in read ? read.input.hash : read.error.hash ?? null;
  const settingsHash = hashSettings({ managed, prune, kibanaVersion });

  // During a rolling restart, an instance that is about to stop can claim the run a new one asked
  // for, while it still mounts the old files or runs the old version.
  const mismatch = describeMismatch(expected, { filesHash, settingsHash });
  if (mismatch) {
    if (mayDefer) {
      return { outcome: 'mismatch', reason: mismatch };
    }
    // A run that read the files after this request was numbered already applied what this instance
    // sees, so the status is current and must not turn `failed`.
    if (
      isApplied(last, { filesHash, settingsHash }) &&
      (last?.coveredRequestNumber ?? 0) >= requestNumber
    ) {
      logger.info(
        `Request ${requestNumber} to apply the bootstrap files was never seen by any instance, and a later run already applied what this instance sees; skipping: ${mismatch}`
      );
      return { outcome: 'done' };
    }
    const message = `${mismatch}, so it was not applied. Every instance must mount the same files and run the same settings and Kibana version; a restart asks for a new run`;
    // Not finished: no instance saw what this request asked for, so an older one that matches may
    // still apply.
    await recordFailure(services, { hash: filesHash, startedAt, ...finished }, [message]);
    return { outcome: 'permanent', error: new Error(message) };
  }

  if ('error' in read) {
    const { error } = read;
    await recordFailure(services, { hash: filesHash, startedAt, ...finishedThis }, error.problems);
    // Unreadable files are fixed by a restart, which requests a new run.
    return { outcome: 'permanent', error };
  }
  const { input } = read;
  const { hash, revision } = input;

  // Files that are older than the ones a run already applied, for example on a replica restarted
  // with a stale mount, must not undo them. No `REVISION` on either side leaves the order to the
  // last run.
  if (revision !== undefined && lastRevision !== undefined && revision < lastRevision) {
    logger.warn(
      `The files mounted at ${path} (${hash}) have revision ${revision}, older than revision ${lastRevision}, which a run already applied; skipping`
    );
    return { outcome: 'done' };
  }
  const appliedRevision =
    revision !== undefined || lastRevision !== undefined
      ? { revision: Math.max(revision ?? 0, lastRevision ?? 0) }
      : {};

  // Skip files already applied with the same settings and Kibana version, for example by another
  // replica, unless reapplying and that run read the files before this request was numbered.
  if (
    isApplied(last, { filesHash: hash, settingsHash }) &&
    (!reapplyOnStart || (last?.coveredRequestNumber ?? 0) >= requestNumber)
  ) {
    logger.info(
      `The files mounted at ${path} (${hash}) are already applied with these settings; skipping`
    );
    return { outcome: 'done' };
  }

  await status.set({
    hash,
    status: 'running',
    startedAt,
    kinds: {},
    errors: [],
    ...finished,
    ...appliedRevision,
  });
  try {
    // Read once, before anything is written: what the bootstrap owns when the run starts.
    const owned = await readOwnedState(ledger);
    const outcome = await applyBootstrap({
      input,
      registry,
      managed,
      owned,
      ledger,
      kibanaVersion,
      spaceExists,
      signal,
      logger,
    });
    const pruning = await pruneOwned({
      prune,
      input,
      outcome,
      owned,
      registry,
      ledger,
      signal,
      logger,
    });

    const summary = summarize(outcome, pruning);
    logSummary(logger, `${path} (${hash})`, summary);
    await status.set({
      hash,
      status: summary.status,
      ...finishedThis,
      ...appliedRevision,
      startedAt,
      finishedAt: new Date().toISOString(),
      kinds: summary.kinds,
      errors: summary.errors,
      coveredRequestNumber,
      settingsHash,
    });
    return summary.result;
  } catch (error) {
    // Otherwise the status would stay `running`. Task Manager runs this request again.
    await recordFailure(services, { hash, startedAt, ...finished, ...appliedRevision }, [
      toMessage(error),
    ]);
    throw error;
  }
};
