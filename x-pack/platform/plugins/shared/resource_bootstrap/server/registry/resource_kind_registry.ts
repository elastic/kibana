/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { Logger } from '@kbn/logging';
import { stableStringify } from '@kbn/std';
import type {
  ApplyError,
  ApplyResult,
  GlobalApplyContext,
  JsonValue,
  ResourceKind,
  ResourceOwnership,
  ResourceSpaceSupport,
} from '@kbn/resource-bootstrap-server';
import { MAX_KIND_ID_LENGTH, MAX_OWNED_ID_LENGTH } from '../ledger/ledger_saved_object';
import { toMessage } from '../to_message';

const KIND_ID_PATTERN = /^[a-z][a-z0-9_]*$/;

export interface RegisteredApplyResult extends ApplyResult {
  /** The ids written without error. */
  appliedIds: string[];
  /** Errors the kind marked `permanent`, which no retry can fix. */
  permanent: number;
}

/** A document as declared in the files. */
export interface DeclaredDocument {
  /** Where it is declared, as `<file> entry <n>`, so errors can point to it. */
  source: string;
  body: JsonValue;
}

interface CallContext {
  /** Absent for a kind with `spaces: 'none'`. */
  spaceId?: string;
  signal: AbortSignal;
  logger: Logger;
}

/** One group's documents of a kind, parsed once for the plan and the apply. */
export interface PreparedDocuments {
  /** The id of each valid resource; an id declared more than once is left out and reported. */
  ids: readonly string[];
  /**
   * For kinds that track ownership, the hash of each resource's declaration, its spaces and, for a
   * kind that supports it, the `managed` setting, by id.
   */
  hashes: ReadonlyMap<string, string>;
  /**
   * Documents that failed to parse and ids declared more than once, which are never written and
   * no retry can fix; known before anything is read or written.
   */
  invalid: readonly ApplyError[];
  /**
   * Writes the valid resources, only the `only` ids when given; the kind is not called when there
   * is nothing to write.
   */
  apply: (context: CallContext & { only?: ReadonlySet<string> }) => Promise<RegisteredApplyResult>;
}

/** The documents of a kind declared for one set of spaces. */
export interface DeclaredGroup {
  declarations: readonly DeclaredDocument[];
  spaces: readonly string[];
}

/** One group's documents parsed, or the error preparing them threw. */
export type GroupPreparation = { documents: PreparedDocuments } | { error: unknown };

export interface RegisteredKind {
  readonly id: string;
  readonly dependsOn: readonly string[];
  readonly spaces: ResourceSpaceSupport;
  /**
   * Prepares every group of the kind at once, so each apply also sees what the others declare;
   * returns one preparation per group, in order.
   */
  prepare: (groups: readonly DeclaredGroup[], options: { managed: boolean }) => GroupPreparation[];
  /** Present only for kinds that track ownership. */
  ownership?: ResourceOwnership;
}

const byTierThenId = (a: RegisteredKind, b: RegisteredKind): number =>
  Number(a.spaces !== 'none') - Number(b.spaces !== 'none') || a.id.localeCompare(b.id);

/** Dependencies on kinds that are not registered, such as those of a disabled plugin. */
const findUnknownDependencies = (
  kinds: readonly RegisteredKind[]
): Array<{ id: string; dependency: string }> => {
  const ids = new Set(kinds.map(({ id }) => id));
  return kinds.flatMap(({ id, dependsOn }) =>
    dependsOn.filter((dependency) => !ids.has(dependency)).map((dependency) => ({ id, dependency }))
  );
};

/**
 * Orders kinds so that kinds with `spaces: 'none'` come first and each kind follows its
 * dependencies, breaking ties by id. A dependency that is not registered only drops out of the
 * order, so another plugin failing to register cannot stop Kibana from starting; throws when a
 * dependency cannot come first.
 */
const orderKinds = (kinds: readonly RegisteredKind[]): RegisteredKind[] => {
  const byId = new Map(kinds.map((kind) => [kind.id, kind]));
  for (const { id, spaces, dependsOn } of kinds) {
    for (const dependency of dependsOn) {
      const target = byId.get(dependency);
      if (target && spaces === 'none' && target.spaces !== 'none') {
        throw new Error(
          `Resource kind "${id}" is not tied to a space, so it applies before "${dependency}" and cannot depend on it`
        );
      }
    }
  }

  const ordered: RegisteredKind[] = [];
  const done = new Set<string>();
  const remaining = [...kinds].sort(byTierThenId);
  while (remaining.length > 0) {
    const index = remaining.findIndex(({ dependsOn }) =>
      dependsOn.every((dependency) => done.has(dependency) || !byId.has(dependency))
    );
    if (index === -1) {
      throw new Error(
        `Resource kinds ${remaining
          .map(({ id }) => `"${id}"`)
          .join(', ')} cannot be ordered: their dependencies contain a cycle`
      );
    }
    const [next] = remaining.splice(index, 1);
    ordered.push(next);
    done.add(next.id);
  }
  return ordered;
};

export class ResourceKindRegistry {
  private readonly kinds = new Map<string, RegisteredKind>();
  private frozen = false;
  private ordered?: RegisteredKind[];
  private spaceLookup?: { kindId: string; spaceExists: (spaceId: string) => Promise<boolean> };

  register<TResource>(kind: ResourceKind<TResource>): void {
    const {
      id,
      dependsOn = [],
      spaces,
      parse,
      idOf,
      ownership,
      spaceExists,
      supportsManaged = false,
    } = kind;
    // A kind not tied to a space gets no `spaceId`; every other kind gets its group's first space.
    const apply = ({
      spaceId,
      ...context
    }: GlobalApplyContext<TResource> & { spaceId?: string }): Promise<ApplyResult> => {
      if (kind.spaces === 'none') {
        return kind.apply(context);
      }
      if (spaceId === undefined) {
        throw new Error(`The ${id} resources must be applied in a space`);
      }
      return kind.apply({ ...context, spaceId });
    };

    if (this.frozen) {
      throw new Error(`Resource kind "${id}" was registered too late: register it during setup`);
    }
    if (!KIND_ID_PATTERN.test(id)) {
      throw new Error(`Invalid resource kind id "${id}": expected ${KIND_ID_PATTERN}`);
    }
    // The ledger could not record its resources, which would fail every run that applies them.
    if (id.length > MAX_KIND_ID_LENGTH) {
      throw new Error(
        `Invalid resource kind id "${id}": it is ${id.length} characters long; the most is ${MAX_KIND_ID_LENGTH}`
      );
    }
    if (this.kinds.has(id)) {
      throw new Error(`Resource kind "${id}" is already registered`);
    }
    if (spaces === 'isolated' && ownership && !ownership.remove) {
      throw new Error(
        `Resource kind "${id}" lives in one space, so its ownership needs \`remove\` to move a resource to another space`
      );
    }
    if (spaceExists && spaces !== 'none') {
      throw new Error(
        `Resource kind "${id}" looks spaces up, so it must not be tied to a space: set \`spaces: 'none'\``
      );
    }
    if (spaceExists && this.spaceLookup) {
      throw new Error(
        `Resource kind "${id}" looks spaces up, but "${this.spaceLookup.kindId}" already does`
      );
    }
    if (spaceExists) {
      this.spaceLookup = { kindId: id, spaceExists };
    }

    this.kinds.set(id, {
      id,
      dependsOn: [...dependsOn],
      spaces,
      ownership,
      prepare: (groups, { managed }) => {
        const parseGroup = ({ declarations, spaces: declaredSpaces }: DeclaredGroup) => {
          const parsed: Array<{
            source: string;
            document: JsonValue;
            resource: TResource;
            resourceId: string;
          }> = [];
          const permanent: ApplyError[] = [];
          for (const { source, body: document } of declarations) {
            try {
              const resource = parse(document);
              const resourceId = idOf(resource);
              // The ledger could not record it, which would fail the whole group on every run.
              if (ownership && resourceId.length > MAX_OWNED_ID_LENGTH) {
                throw new Error(
                  `the id is ${resourceId.length} characters long; the most is ${MAX_OWNED_ID_LENGTH}`
                );
              }
              parsed.push({ source, document, resource, resourceId });
            } catch (error) {
              permanent.push({
                message: `Invalid ${id} resource in ${source}: ${toMessage(error)}`,
              });
            }
          }

          const sourcesById = new Map<string, string[]>();
          for (const { source, resourceId } of parsed) {
            sourcesById.set(resourceId, [...(sourcesById.get(resourceId) ?? []), source]);
          }

          const resources: TResource[] = [];
          const ids: string[] = [];
          const hashes = new Map<string, string>();
          for (const { source, document, resource, resourceId } of parsed) {
            const sources = sourcesById.get(resourceId) ?? [];
            // Each apply would let the last declaration win, so none of them is applied.
            if (sources.length > 1) {
              permanent.push({
                id: resourceId,
                message: `Invalid ${id} resource in ${source}: the id "${resourceId}" is declared in ${sources.join(
                  ', '
                )}; declare it once`,
              });
              continue;
            }
            resources.push(resource);
            ids.push(resourceId);
            if (ownership) {
              // `managed` only changes what a kind that supports it writes.
              hashes.set(
                resourceId,
                createHash('sha256')
                  .update(
                    stableStringify({
                      ...(supportsManaged && { managed }),
                      spaces: declaredSpaces,
                      document,
                    })
                  )
                  .digest('hex')
              );
            }
          }
          return { declaredSpaces, permanent, resources, ids, hashes };
        };

        const parsedGroups = groups.map(
          (group): { group: ReturnType<typeof parseGroup> } | { error: unknown } => {
            try {
              return { group: parseGroup(group) };
            } catch (error) {
              return { error };
            }
          }
        );
        const declared = parsedGroups.flatMap((parsed) =>
          'group' in parsed ? parsed.group.resources : []
        );

        return parsedGroups.map((parsed): GroupPreparation => {
          if (!('group' in parsed)) {
            return parsed;
          }
          const { declaredSpaces, permanent, resources, ids, hashes } = parsed.group;
          return {
            documents: {
              ids,
              hashes,
              invalid: permanent,
              apply: async ({ only, ...context }) => {
                const toApply = ids.flatMap((resourceId, index) =>
                  only === undefined || only.has(resourceId)
                    ? [{ resourceId, resource: resources[index] }]
                    : []
                );
                const result: ApplyResult =
                  toApply.length === 0
                    ? { applied: 0, errors: [] }
                    : await apply({
                        ...context,
                        spaces: declaredSpaces,
                        managed,
                        resources: toApply.map(({ resource }) => resource),
                        declared,
                      });
                const failedIds = new Set(result.errors.map((error) => error.id));
                // An error without an id could be any resource, so none counts as applied.
                const appliedIds = failedIds.has(undefined)
                  ? []
                  : toApply
                      .map(({ resourceId }) => resourceId)
                      .filter((resourceId) => !failedIds.has(resourceId));
                return {
                  applied: result.applied,
                  ...(!ownership && result.created !== undefined && { created: result.created }),
                  errors: result.errors,
                  permanent: result.errors.filter((error) => error.permanent).length,
                  appliedIds,
                };
              },
            },
          };
        });
      },
    });
  }

  /**
   * Rejects later registrations so the kinds cannot change during a run, and orders them once, so
   * a cyclic dependency fails at start rather than in a run; an unknown one is only logged.
   */
  freeze(logger: Logger): void {
    const kinds = [...this.kinds.values()];
    for (const { id, dependency } of findUnknownDependencies(kinds)) {
      logger.warn(
        `Resource kind "${id}" depends on "${dependency}", which is not registered, so it is applied without waiting for it`
      );
    }
    this.ordered = orderKinds(kinds);
    this.frozen = true;
  }

  has(id: string): boolean {
    return this.kinds.has(id);
  }

  get(id: string): RegisteredKind | undefined {
    return this.kinds.get(id);
  }

  getOrdered(): RegisteredKind[] {
    return this.ordered ?? orderKinds([...this.kinds.values()]);
  }

  /** The space lookup a registered kind gives, if any; none without the spaces plugin. */
  getSpaceExists(): ((spaceId: string) => Promise<boolean>) | undefined {
    return this.spaceLookup?.spaceExists;
  }
}
