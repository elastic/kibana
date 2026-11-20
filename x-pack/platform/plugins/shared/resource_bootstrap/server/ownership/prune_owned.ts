/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { Logger } from '@kbn/logging';
import type { ResourceOwnership } from '@kbn/resource-bootstrap-server';
import type { BootstrapError } from '../../common';
import type { BootstrapOutcome } from '../apply/apply_bootstrap';
import type { LedgerClient } from '../ledger/ledger_client';
import type { BootstrapInput } from '../reader/read_bootstrap_files';
import type { ResourceKindRegistry } from '../registry/resource_kind_registry';
import { toMessage } from '../to_message';
import type { OwnedState } from './owned_state';

export interface PruneResult {
  /** How many objects of each kind were deleted. */
  pruned: Record<string, number>;
  errors: BootstrapError[];
}

/**
 * Allows pruning only when opted in, after a run without errors that declared something, so a bad
 * mount, or one whose files were all emptied, cannot delete everything.
 */
export const canPrune = ({
  prune,
  input,
  outcome,
}: {
  prune: boolean;
  input: BootstrapInput;
  outcome: Pick<BootstrapOutcome, 'status'>;
}): boolean =>
  prune &&
  outcome.status === 'completed' &&
  input.groups.some(({ documents }) => documents.length > 0);

/** Owned objects that left the files, by kind and the space to delete them through. */
interface StaleGroup {
  kind: string;
  /** Absent for a kind not tied to a space. */
  spaceId?: string;
  remove: NonNullable<ResourceOwnership['remove']>;
  /** The ledger document id of each owned id. */
  docIds: Map<string, string>;
}

const groupStale = (
  owned: OwnedState,
  declared: ReadonlySet<string>,
  registry: ResourceKindRegistry
): StaleGroup[] => {
  const groups = new Map<string, StaleGroup>();
  for (const [
    docId,
    {
      kind,
      id,
      // Empty for a kind not tied to a space.
      spaces: [spaceId],
    },
  ] of owned) {
    const ownership = registry.get(kind)?.ownership;
    // A kind that is no longer registered, or that never deletes, cannot delete its objects, so
    // its entries are kept.
    if (declared.has(docId) || !ownership?.remove) {
      continue;
    }
    const { remove } = ownership;
    const groupKey = `${kind}\0${spaceId ?? ''}`;
    const group = groups.get(groupKey) ?? { kind, spaceId, remove, docIds: new Map() };
    // An entry owned before a create that was never confirmed is deleted too: its id is owned, and
    // a missing object is not an error.
    group.docIds.set(id, docId);
    groups.set(groupKey, group);
  }
  return [...groups.values()];
};

/** Deletes the owned objects that left the files and forgets them; failed deletes stay owned. */
export const pruneOwned = async ({
  prune,
  input,
  outcome,
  owned,
  registry,
  ledger,
  signal,
  logger,
}: {
  prune: boolean;
  input: BootstrapInput;
  outcome: Pick<BootstrapOutcome, 'status' | 'declared'>;
  owned: OwnedState;
  registry: ResourceKindRegistry;
  ledger: Pick<LedgerClient, 'remove'>;
  signal: AbortSignal;
  logger: Logger;
}): Promise<PruneResult> => {
  const result: PruneResult = { pruned: {}, errors: [] };
  if (!canPrune({ prune, input, outcome })) {
    return result;
  }

  const forgotten: string[] = [];
  for (const { kind, spaceId, remove, docIds } of groupStale(owned, outcome.declared, registry)) {
    if (signal.aborted) {
      throw new Error('Pruning the bootstrap resources was aborted');
    }
    try {
      const { removed, errors } = await remove({
        // A client scoped to any space finds the objects of a kind not tied to a space.
        spaceId: spaceId ?? DEFAULT_SPACE_ID,
        ids: [...docIds.keys()],
        signal,
        logger,
      });
      result.pruned[kind] = (result.pruned[kind] ?? 0) + removed;
      result.errors.push(
        ...errors.map(({ id, message }) => ({
          kind,
          ...(spaceId !== undefined && { spaceId }),
          ...(id !== undefined && { id }),
          message,
        }))
      );
      // An error without an id could be any object, so none of them is forgotten.
      if (errors.some(({ id }) => id === undefined)) {
        continue;
      }
      const failedIds = new Set(errors.map(({ id }) => id));
      for (const [id, docId] of docIds) {
        if (!failedIds.has(id)) {
          forgotten.push(docId);
        }
      }
    } catch (error) {
      // A stop is not a failure of this group; let it through so the run stops here.
      if (signal.aborted) {
        throw error;
      }
      result.errors.push({
        kind,
        ...(spaceId !== undefined && { spaceId }),
        message: toMessage(error),
      });
    }
  }

  await ledger.remove(forgotten);
  return result;
};
