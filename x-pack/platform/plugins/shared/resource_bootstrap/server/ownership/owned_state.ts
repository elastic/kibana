/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { StoredVersion } from '@kbn/resource-bootstrap-server';
import type { LedgerEntry } from '../../common';
import type { LedgerClient } from '../ledger/ledger_client';

/** What the bootstrap owns, by ledger document id; read once per run, before anything is written. */
export type OwnedState = ReadonlyMap<string, LedgerEntry>;

export const readOwnedState = async (ledger: Pick<LedgerClient, 'list'>): Promise<OwnedState> =>
  new Map((await ledger.list()).map(({ docId, entry }) => [docId, entry]));

/** The id of the ledger document that owns an object: one per object, whatever space declares it. */
export const ledgerIdOf = (kind: string, id: string): string =>
  createHash('sha256').update(`${kind}\0${id}`).digest('hex');

/**
 * Whether an owned object is still as the bootstrap last wrote it, so writing it again changes
 * nothing. Within one Kibana version the stored version tells. An upgrade's migrations change the
 * version but keep `updated_at`, so after one, `updated_at` tells. Anything unknown counts as
 * changed.
 */
export const isUnchanged = (
  { appliedHash, objectVersion, objectUpdatedAt, kibanaVersion: writtenBy }: LedgerEntry,
  { hash, stored, kibanaVersion }: { hash: string; stored: StoredVersion; kibanaVersion: string }
): boolean => {
  if (appliedHash === undefined || appliedHash !== hash) {
    return false;
  }
  return writtenBy === kibanaVersion
    ? objectVersion !== undefined && objectVersion === stored.version
    : objectUpdatedAt !== undefined && objectUpdatedAt === stored.updatedAt;
};

/** What to do with each declared id of a group. */
export interface GroupPlan {
  /** Not owned and missing: owned first, then created. */
  create: string[];
  /** Owned, and missing or changed since the bootstrap last wrote it: written again. */
  write: string[];
  /** Owned and as the bootstrap last wrote it: left as it is. */
  unchanged: string[];
  /** Exists, but the bootstrap did not create it: never taken over, so it fails. */
  notOwned: string[];
}

/**
 * Sorts the declared ids of a group. An entry owned before a create that was never confirmed is
 * owned like any other, whether or not the create happened:
 *
 * | Owned | Stored now                 | Action                     |
 * | ----- | -------------------------- | -------------------------- |
 * | no    | exists                     | fail it: `notOwned`        |
 * | no    | missing                    | own it, then `create` it   |
 * | yes   | missing                    | `write` it to create again |
 * | yes   | exists, as last written    | leave it `unchanged`       |
 * | yes   | exists, anything else      | `write` it                 |
 */
export const planGroup = ({
  ids,
  hashes,
  stored,
  entryOf,
  kibanaVersion,
}: {
  ids: readonly string[];
  hashes: ReadonlyMap<string, string>;
  stored: Readonly<Record<string, StoredVersion>>;
  entryOf: (id: string) => LedgerEntry | undefined;
  kibanaVersion: string;
}): GroupPlan => {
  const plan: GroupPlan = { create: [], write: [], unchanged: [], notOwned: [] };
  for (const id of ids) {
    const entry = entryOf(id);
    const current = stored[id];
    const hash = hashes.get(id);
    if (entry === undefined) {
      plan[current === undefined ? 'create' : 'notOwned'].push(id);
    } else if (
      current !== undefined &&
      hash !== undefined &&
      isUnchanged(entry, { hash, stored: current, kibanaVersion })
    ) {
      plan.unchanged.push(id);
    } else {
      plan.write.push(id);
    }
  }
  return plan;
};
