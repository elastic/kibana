/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { Logger } from '@kbn/logging';
import type {
  ResourceOwnership,
  ResourceSpaceSupport,
  StoredVersion,
} from '@kbn/resource-bootstrap-server';
import type { BootstrapError, KindResult, LedgerEntry } from '../../common';
import type { LedgerClient } from '../ledger/ledger_client';
import { ledgerIdOf, planGroup, type OwnedState } from '../ownership/owned_state';
import {
  SPACES_FIELD,
  type BootstrapDocument,
  type BootstrapInput,
} from '../reader/read_bootstrap_files';
import type {
  DeclaredDocument,
  GroupPreparation,
  PreparedDocuments,
  RegisteredApplyResult,
  RegisteredKind,
  ResourceKindRegistry,
} from '../registry/resource_kind_registry';
import type { SpaceExists } from '../space_exists';
import { toMessage } from '../to_message';

export interface BootstrapOutcome {
  status: 'completed' | 'failed';
  kinds: Record<string, KindResult>;
  /** Every error; the status keeps only the first ones. */
  errors: BootstrapError[];
  /** The ledger ids of every object the files declare for a kind with ownership. */
  declared: ReadonlySet<string>;
  /** False when no error can be fixed by applying the same files again. */
  retryable: boolean;
}

interface SpaceGroup {
  /** The first space of the group in sorted order; absent for a kind not tied to a space. */
  spaceId?: string;
  spaces: string[];
  declarations: DeclaredDocument[];
}

/** Splits documents into calls: one for global kinds, one per space, or one per set of spaces. */
const toSpaceGroups = (
  support: ResourceSpaceSupport,
  documents: BootstrapDocument[]
): SpaceGroup[] => {
  if (documents.length === 0) {
    return [];
  }
  if (support === 'none') {
    return [{ spaces: [], declarations: documents }];
  }
  const groups = new Map<string, SpaceGroup>();
  const add = (spaces: string[], declaration: DeclaredDocument) => {
    const key = spaces.join(',');
    const group = groups.get(key) ?? { spaceId: spaces[0], spaces, declarations: [] };
    group.declarations.push(declaration);
    groups.set(key, group);
  };
  for (const { spaces = [DEFAULT_SPACE_ID], source, body } of documents) {
    if (support === 'shared') {
      add(spaces, { source, body });
    } else {
      spaces.forEach((spaceId) => add([spaceId], { source, body }));
    }
  }
  return [...groups.values()];
};

/** The `spaceId` field of an error, left out when it is not tied to a space. */
const spaceFieldOf = (spaceId: string | undefined): { spaceId?: string } =>
  spaceId !== undefined ? { spaceId } : {};

const inSpace = (spaceId: string | undefined): string =>
  spaceId !== undefined ? ` in space "${spaceId}"` : '';

// A client scoped to any space finds the objects of a kind not tied to a space.
const lookupSpaceOf = (spaceId: string | undefined): string => spaceId ?? DEFAULT_SPACE_ID;

/** A group with its documents parsed, or the error preparing them threw. */
interface PreparedGroup extends SpaceGroup {
  prepared: GroupPreparation;
}

interface KindPlan {
  kind: RegisteredKind;
  groups: PreparedGroup[];
}

/**
 * Declarations in different groups that name the same stored object, such as a data view declared
 * for two sets of spaces: each apply would undo the other, so they fail the run instead.
 */
const findConflicts = (plan: readonly KindPlan[]): BootstrapError[] =>
  plan.flatMap(({ kind, groups }) => {
    const declarations = new Map<string, { id: string; spaceId?: string; spaces: string[][] }>();
    for (const { spaceId, spaces, prepared } of groups) {
      if (!('documents' in prepared)) {
        continue;
      }
      for (const id of prepared.documents.ids) {
        // An owned or shared id names the same object in every space; any other names one within its space.
        const key = kind.ownership || kind.spaces === 'shared' ? id : `${spaceId ?? ''}\0${id}`;
        const declaration = declarations.get(key) ?? { id, spaceId, spaces: [] };
        declaration.spaces.push(spaces);
        declarations.set(key, declaration);
      }
    }
    return [...declarations.values()]
      .filter(({ spaces }) => spaces.length > 1)
      .map(({ id, spaceId, spaces }) => ({
        kind: kind.id,
        ...spaceFieldOf(spaceId),
        id,
        message: `The ${kind.id} "${id}" is declared for different spaces (${spaces
          .map((names) => `[${names.join(', ')}]`)
          .join(' and ')}), so each apply would undo the other; declare it once`,
      }));
  });

/** The ledger ids of every object the files declare for a kind with ownership; pruning keeps them. */
const findDeclared = (plan: readonly KindPlan[]): Set<string> =>
  new Set(
    plan.flatMap(({ kind: { id: kind, ownership }, groups }) =>
      ownership
        ? groups.flatMap(({ prepared }) =>
            'documents' in prepared ? prepared.documents.ids.map((id) => ledgerIdOf(kind, id)) : []
          )
        : []
    )
  );

const rejectRun = (errors: BootstrapError[]): BootstrapOutcome => ({
  status: 'failed',
  kinds: {},
  errors,
  declared: new Set(),
  retryable: false,
});

interface GroupContext {
  kind: RegisteredKind;
  owned: OwnedState;
  ledger: Pick<LedgerClient, 'put' | 'remove'>;
  kibanaVersion: string;
  signal: AbortSignal;
  logger: Logger;
}

/** What one group adds to the outcome of the run. */
interface GroupResult {
  counts: Partial<KindResult>;
  errors: BootstrapError[];
  permanentErrors: number;
  retryableErrors: number;
}

// Spelled out so `permanent` stays out of the status.
const toBootstrapErrors = (
  kind: string,
  spaceId: string | undefined,
  errors: RegisteredApplyResult['errors']
): BootstrapError[] =>
  errors.map(({ id, message }) => ({
    kind,
    ...spaceFieldOf(spaceId),
    ...(id !== undefined && { id }),
    message,
  }));

/** Applies a group of a kind without ownership: every resource is written on every run. */
const applyUntracked = async (
  { kind, signal, logger }: GroupContext,
  { spaceId }: SpaceGroup,
  { apply }: PreparedDocuments
): Promise<GroupResult> => {
  const result = await apply({ ...spaceFieldOf(spaceId), signal, logger });
  return {
    counts: { applied: result.applied, created: result.created ?? 0, failed: result.errors.length },
    errors: toBootstrapErrors(kind.id, spaceId, result.errors),
    permanentErrors: result.permanent,
    retryableErrors: result.errors.length - result.permanent,
  };
};

/** Records the written ids with their stored versions, and gives up creates that own nothing. */
const recordOutcome = async (
  { kind, ledger, kibanaVersion, signal, logger }: GroupContext,
  ownership: ResourceOwnership,
  { spaceId, spaces }: SpaceGroup,
  {
    written,
    failedCreates,
    conflicts,
    hashes,
  }: {
    written: string[];
    failedCreates: string[];
    /** Ids whose write was refused as a conflict, so it created nothing. */
    conflicts: ReadonlySet<string>;
    hashes: ReadonlyMap<string, string>;
  }
): Promise<BootstrapError[]> => {
  const ids = [...written, ...failedCreates];
  if (ids.length === 0) {
    return [];
  }
  const stored = await ownership
    .versions({ spaceId: lookupSpaceOf(spaceId), ids, signal, logger })
    .catch((error): Record<string, StoredVersion> | undefined => {
      if (signal.aborted) {
        throw error;
      }
      logger.warn(
        `Could not read the ${kind.id} resources written${inSpace(
          spaceId
        )}, so the next run writes them again: ${toMessage(error)}`
      );
      return undefined;
    });
  const docIdOf = (id: string) => ledgerIdOf(kind.id, id);

  try {
    await ledger.put(
      written.map((id) => {
        const hash = hashes.get(id);
        const version = stored?.[id];
        return {
          docId: docIdOf(id),
          entry: {
            kind: kind.id,
            id,
            spaces,
            ...(hash !== undefined && { appliedHash: hash }),
            ...(version !== undefined && { objectVersion: version.version }),
            ...(version?.updatedAt !== undefined && { objectUpdatedAt: version.updatedAt }),
            kibanaVersion,
          },
        };
      })
    );
    // An object stored after a conflict is someone else's, since the create was refused.
    await ledger.remove(
      failedCreates
        .filter((id) => conflicts.has(id) || (stored !== undefined && stored[id] === undefined))
        .map(docIdOf)
    );
    return [];
  } catch (error) {
    if (signal.aborted) {
      throw error;
    }
    return [
      {
        kind: kind.id,
        ...spaceFieldOf(spaceId),
        message: `The resources written${inSpace(
          spaceId
        )} could not be recorded, so the next run writes them again: ${toMessage(error)}`,
      },
    ];
  }
};

/** Deletes owned objects from the space they moved from; returns the ids it could not delete. */
const removeMoved = async (
  { kind, owned, signal, logger }: GroupContext,
  remove: NonNullable<ResourceOwnership['remove']>,
  { spaceId }: SpaceGroup,
  { missing, docIdOf }: { missing: string[]; docIdOf: (id: string) => string }
): Promise<{ errors: BootstrapError[]; notRemoved: ReadonlySet<string> }> => {
  const byPreviousSpace = new Map<string, string[]>();
  for (const id of missing) {
    const entry = owned.get(docIdOf(id));
    const previousSpace = entry?.spaces[0];
    if (previousSpace !== undefined && previousSpace !== spaceId) {
      byPreviousSpace.set(previousSpace, [...(byPreviousSpace.get(previousSpace) ?? []), id]);
    }
  }

  const errors: BootstrapError[] = [];
  const notRemoved = new Set<string>();
  for (const [previousSpace, ids] of byPreviousSpace) {
    try {
      const result = await remove({ spaceId: previousSpace, ids, signal, logger });
      // An error without an id could be any of them.
      const failedIds = result.errors.some(({ id }) => id === undefined)
        ? ids
        : result.errors.flatMap(({ id }) => (id === undefined ? [] : [id]));
      failedIds.forEach((id) => notRemoved.add(id));
      errors.push(
        ...result.errors.map(({ id, message }) => ({
          kind: kind.id,
          ...spaceFieldOf(spaceId),
          ...(id !== undefined && { id }),
          message: `Could not delete the ${kind.id} from the space "${previousSpace}" it was declared in before, so it is not moved: ${message}`,
        }))
      );
      const removedIds = ids.filter((id) => !notRemoved.has(id));
      if (removedIds.length > 0) {
        const quoted = removedIds.map((id) => `"${id}"`).join(', ');
        logger.info(
          `Deleted the ${kind.id} resources ${quoted} from the space "${previousSpace}", since they are now declared in "${spaceId}"`
        );
      }
    } catch (error) {
      if (signal.aborted) {
        throw error;
      }
      ids.forEach((id) => notRemoved.add(id));
      errors.push({
        kind: kind.id,
        ...spaceFieldOf(spaceId),
        message: `Could not delete the ${
          kind.id
        } resources declared in the space "${previousSpace}" before, so they are not moved: ${toMessage(
          error
        )}`,
      });
    }
  }
  return { errors, notRemoved };
};

/**
 * Records the objects left unchanged after a Kibana upgrade with the version they are stored at now,
 * so later runs compare that version again instead of only `updated_at`. A failure only means the
 * next run compares `updated_at` again, so it is logged and not reported.
 */
const restampUnchanged = async (
  { ledger, kibanaVersion, signal, logger, kind }: GroupContext,
  spaceId: string | undefined,
  {
    unchanged,
    stored,
    entryOf,
    docIdOf,
  }: {
    unchanged: string[];
    stored: Readonly<Record<string, StoredVersion>>;
    entryOf: (id: string) => LedgerEntry | undefined;
    docIdOf: (id: string) => string;
  }
): Promise<void> => {
  const items = unchanged.flatMap((id) => {
    const entry = entryOf(id);
    const version = stored[id];
    return entry === undefined || version === undefined || entry.kibanaVersion === kibanaVersion
      ? []
      : [
          {
            docId: docIdOf(id),
            entry: { ...entry, objectVersion: version.version, kibanaVersion },
          },
        ];
  });
  if (items.length === 0) {
    return;
  }
  try {
    await ledger.put(items);
  } catch (error) {
    if (signal.aborted) {
      throw error;
    }
    logger.warn(
      `Could not record the ${kind.id} resources${inSpace(
        spaceId
      )} for this Kibana version, so the next run compares when they were last written again: ${toMessage(
        error
      )}`
    );
  }
};

/**
 * Applies a group of a kind with ownership as `planGroup` sorts it: an object the bootstrap creates
 * is owned before it is created, one it does not own is never taken over, and one it owns is
 * written again only when it changed or is gone, after deleting it from the space it was declared
 * in before when it moved.
 */
const applyOwned = async (
  context: GroupContext,
  ownership: ResourceOwnership,
  group: SpaceGroup,
  { ids, hashes, apply }: PreparedDocuments
): Promise<GroupResult> => {
  const { kind, owned, ledger, kibanaVersion, signal, logger } = context;
  const { spaceId, spaces } = group;
  const docIdOf = (id: string) => ledgerIdOf(kind.id, id);

  const stored = await ownership.versions({
    spaceId: lookupSpaceOf(spaceId),
    ids: [...ids],
    signal,
    logger,
  });
  const plan = planGroup({
    ids,
    hashes,
    stored,
    entryOf: (id) => owned.get(docIdOf(id)),
    kibanaVersion,
  });

  // The registry requires `remove` of an isolated kind with ownership.
  const moved =
    kind.spaces === 'isolated' && ownership.remove
      ? await removeMoved(context, ownership.remove, group, {
          missing: plan.write.filter((id) => stored[id] === undefined),
          docIdOf,
        })
      : { errors: [], notRemoved: new Set<string>() };
  const attempted = new Set(
    [...plan.create, ...plan.write].filter((id) => !moved.notRemoved.has(id))
  );

  // Owned before they are created, so a run stopped in between still owns them.
  await ledger.put(
    plan.create.map((id) => ({ docId: docIdOf(id), entry: { kind: kind.id, id, spaces } }))
  );
  // An entry never recorded as written was owned before a create that may never have happened.
  const failedCreatesOf = (applied: ReadonlySet<string>) =>
    [
      ...plan.create,
      ...plan.write.filter((id) => owned.get(docIdOf(id))?.appliedHash === undefined),
    ].filter((id) => attempted.has(id) && !applied.has(id));
  const result = await apply({
    ...spaceFieldOf(spaceId),
    signal,
    logger,
    only: attempted,
  }).catch(async (error) => {
    if (signal.aborted) {
      throw error;
    }
    // A kind settles its writes before it throws, so what is stored now is what it created.
    await recordOutcome(context, ownership, group, {
      written: [],
      failedCreates: failedCreatesOf(new Set()),
      conflicts: new Set(),
      hashes,
    });
    throw error;
  });
  const recordErrors = await recordOutcome(context, ownership, group, {
    written: result.appliedIds,
    failedCreates: failedCreatesOf(new Set(result.appliedIds)),
    // A conflict on an object stored before the write is a refused update, not a refused create.
    conflicts: new Set(
      result.errors.flatMap(({ id, conflict }) =>
        conflict && id !== undefined && stored[id] === undefined ? [id] : []
      )
    ),
    hashes,
  });
  await restampUnchanged(context, spaceId, {
    unchanged: plan.unchanged,
    stored,
    entryOf: (id) => owned.get(docIdOf(id)),
    docIdOf,
  });

  const notOwnedErrors = plan.notOwned.map((id) => ({
    kind: kind.id,
    ...spaceFieldOf(spaceId),
    id,
    message: `The ${kind.id} "${id}" already exists and the bootstrap did not create it, so it is not applied. Delete it, or declare it with another id`,
  }));
  return {
    counts: {
      applied: result.applied,
      created: result.appliedIds.filter((id) => stored[id] === undefined).length,
      unchanged: plan.unchanged.length,
      failed: result.errors.length + plan.notOwned.length + moved.notRemoved.size,
    },
    errors: [
      ...notOwnedErrors,
      ...moved.errors,
      ...toBootstrapErrors(kind.id, spaceId, result.errors),
      ...recordErrors,
    ],
    permanentErrors: plan.notOwned.length + result.permanent,
    retryableErrors:
      result.errors.length - result.permanent + recordErrors.length + moved.errors.length,
  };
};

/**
 * Applies one group; a failure is returned as its result, and only an abort throws. Invalid
 * documents are reported even when the group fails, so they do not wait for the failure to pass.
 */
const applyGroup = async (context: GroupContext, group: PreparedGroup): Promise<GroupResult> => {
  const { kind, signal, logger } = context;
  const { prepared, spaceId, declarations } = group;
  const invalid =
    'documents' in prepared ? toBootstrapErrors(kind.id, spaceId, prepared.documents.invalid) : [];
  try {
    if ('error' in prepared) {
      throw prepared.error;
    }
    const { documents } = prepared;
    const result = kind.ownership
      ? await applyOwned(context, kind.ownership, group, documents)
      : await applyUntracked(context, group, documents);
    return {
      counts: { ...result.counts, failed: (result.counts.failed ?? 0) + invalid.length },
      errors: [...invalid, ...result.errors],
      permanentErrors: result.permanentErrors + invalid.length,
      retryableErrors: result.retryableErrors,
    };
  } catch (error) {
    if (signal.aborted) {
      throw error;
    }
    logger.error(`Applying ${kind.id} resources${inSpace(spaceId)} failed: ${toMessage(error)}`);
    return {
      counts: { failed: declarations.length },
      errors: [...invalid, { kind: kind.id, ...spaceFieldOf(spaceId), message: toMessage(error) }],
      permanentErrors: invalid.length,
      retryableErrors: 1,
    };
  }
};

/**
 * Applies every kind in order, once per group of spaces. Unknown kinds, invalid `spaces` or one
 * object declared for different spaces fail the run before anything is applied.
 */
export const applyBootstrap = async ({
  input,
  registry,
  managed,
  owned,
  ledger,
  kibanaVersion,
  spaceExists,
  signal,
  logger,
}: {
  input: BootstrapInput;
  registry: ResourceKindRegistry;
  managed: boolean;
  /** What the bootstrap owned when the run started. */
  owned: OwnedState;
  ledger: Pick<LedgerClient, 'put' | 'remove'>;
  kibanaVersion: string;
  spaceExists?: SpaceExists;
  signal: AbortSignal;
  logger: Logger;
}): Promise<BootstrapOutcome> => {
  const unknownKinds = [...new Set(input.groups.map(({ kind }) => kind))].filter(
    (kind) => !registry.has(kind)
  );
  const rejected: BootstrapError[] = [
    ...unknownKinds.map((kind) => ({
      kind,
      message: `No resource kind "${kind}" is registered`,
    })),
    ...input.groups.flatMap(({ kind, documents }) => {
      const support = registry.get(kind)?.spaces;
      if (support === 'none' && documents.some(({ spaces }) => spaces)) {
        return [
          {
            kind,
            message: `The kind "${kind}" is not tied to a space, so its documents cannot name "${SPACES_FIELD}"`,
          },
        ];
      }
      if (support === 'isolated' && documents.some(({ spaces }) => (spaces?.length ?? 0) > 1)) {
        return [
          {
            kind,
            message: `A "${kind}" lives in one space, so a document cannot name more than one in "${SPACES_FIELD}"`,
          },
        ];
      }
      return [];
    }),
  ];
  if (rejected.length > 0) {
    return rejectRun(rejected);
  }

  const plan: KindPlan[] = registry.getOrdered().map((kind) => {
    const documents = input.groups
      .filter((group) => group.kind === kind.id)
      .flatMap((group) => group.documents);
    const spaceGroups = toSpaceGroups(kind.spaces, documents);
    const prepared = kind.prepare(spaceGroups, { managed });
    return {
      kind,
      groups: spaceGroups.map((spaceGroup, index) => ({
        ...spaceGroup,
        prepared: prepared[index],
      })),
    };
  });
  const conflicts = findConflicts(plan);
  if (conflicts.length > 0) {
    return rejectRun(conflicts);
  }

  const kinds: Record<string, KindResult> = {};
  const errors: BootstrapError[] = [];
  const addToKind = (kind: string, delta: Partial<KindResult>) => {
    const total = kinds[kind] ?? { applied: 0, created: 0, unchanged: 0, failed: 0 };
    kinds[kind] = {
      applied: total.applied + (delta.applied ?? 0),
      created: (total.created ?? 0) + (delta.created ?? 0),
      unchanged: (total.unchanged ?? 0) + (delta.unchanged ?? 0),
      failed: total.failed + (delta.failed ?? 0),
    };
  };
  let permanentErrors = 0;
  let retryableErrors = 0;

  // Objects in a missing space are invisible, so warn once per space about a likely typo. The check
  // runs on first use, after declared spaces were created.
  const checkedSpaces = new Set<string>();
  const warnIfSpaceIsMissing = async (spaceId: string): Promise<void> => {
    if (!spaceExists || checkedSpaces.has(spaceId)) {
      return;
    }
    checkedSpaces.add(spaceId);
    if ((await spaceExists(spaceId)) === false) {
      logger.warn(
        `Applying resources into the space "${spaceId}", which does not exist, so they cannot be seen; check the "${SPACES_FIELD}" field for a typo`
      );
    }
  };

  for (const { kind, groups } of plan) {
    for (const group of groups) {
      if (signal.aborted) {
        throw new Error('Applying the bootstrap resources was aborted');
      }
      for (const space of group.spaces) {
        await warnIfSpaceIsMissing(space);
      }

      const result = await applyGroup(
        { kind, owned, ledger, kibanaVersion, signal, logger },
        group
      );
      addToKind(kind.id, result.counts);
      errors.push(...result.errors);
      permanentErrors += result.permanentErrors;
      retryableErrors += result.retryableErrors;
    }
  }

  // The last group may have stopped early without throwing and must not look completed.
  if (signal.aborted) {
    throw new Error('Applying the bootstrap resources was aborted');
  }

  return {
    status: errors.length > 0 ? 'failed' : 'completed',
    kinds,
    errors,
    declared: findDeclared(plan),
    retryable: permanentErrors === 0 || retryableErrors > 0,
  };
};
