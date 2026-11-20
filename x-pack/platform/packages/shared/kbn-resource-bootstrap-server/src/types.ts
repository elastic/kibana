/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface ApplyError {
  /** Identifier of the resource that failed, when it has one. */
  readonly id?: string;
  readonly message: string;
  /**
   * Set when applying the same files again cannot fix it, such as a declaration that conflicts
   * with an object only a person can change, so the run is not retried for it.
   */
  readonly permanent?: boolean;
  /**
   * Set when the write was refused because it conflicts with an object already stored, so it
   * created nothing. A resource owned only for this create is then given up, even though an object
   * with its id exists.
   */
  readonly conflict?: boolean;
}

export interface ApplyResult {
  readonly applied: number;
  readonly errors: readonly ApplyError[];
  /**
   * How many of the applied resources did not exist before, for the status. Only a kind without
   * `ownership` reports it; for the others the bootstrap counts what it created itself.
   */
  readonly created?: number;
}

/**
 * `none` for global resources, `isolated` for ones that live in one space, and `shared` for ones
 * that live as one object in every space their document names.
 */
export type ResourceSpaceSupport = 'none' | 'isolated' | 'shared';

export interface ApplyContext<TResource> {
  /** The first of `spaces`. */
  readonly spaceId: string;
  /** Every space the documents name, sorted: more than one only for a `shared` kind. */
  readonly spaces: readonly string[];
  readonly resources: TResource[];
  /**
   * Every valid resource of the kind the files declare, for these spaces and any others, such as
   * one this run applies elsewhere; it includes `resources`.
   */
  readonly declared: readonly TResource[];
  /** Whether created objects should be marked managed; kinds that cannot do so ignore it. */
  readonly managed: boolean;
  /** Aborted when the run is stopped; check it between resources. */
  readonly signal: AbortSignal;
  readonly logger: Logger;
}

/** What `apply` of a kind with `spaces: 'none'` receives: no `spaceId`, and empty `spaces`. */
export type GlobalApplyContext<TResource> = Omit<ApplyContext<TResource>, 'spaceId'>;

export interface OwnershipContext {
  /**
   * The first space the resources are declared in, or `default` for a kind with `spaces: 'none'`,
   * whose objects a client scoped to any space finds.
   */
  readonly spaceId: string;
  readonly ids: string[];
  /** Aborted when the run is stopped. */
  readonly signal: AbortSignal;
  readonly logger: Logger;
}

export interface RemoveResult {
  /** How many objects were deleted; ids that no longer exist are not counted. */
  readonly removed: number;
  /** Ids that no longer exist are not errors. */
  readonly errors: readonly ApplyError[];
}

/** What the bootstrap compares to tell whether an object changed since it last wrote it. */
export interface StoredVersion {
  /** Changes on every write, including the migrations of a Kibana upgrade. */
  readonly version: string;
  /** When the object was last written through its API; upgrade migrations keep it. */
  readonly updatedAt?: string;
}

/**
 * Lets the bootstrap own what it creates, and delete it once it leaves the files when it can. A
 * declared id must name the same object in every space, as for a global object, one that can be
 * shared or one whose id is unique across spaces, so the bootstrap owns it once whatever space
 * declares it.
 */
export interface ResourceOwnership {
  /**
   * Returns the stored version of each given id that exists, and leaves out the ones that do not.
   * It looks in every space the type can be looked up in: all of them for a type that can be
   * shared, the declared one for a space-isolated type. Throws when one cannot be read, so it never
   * passes for one that does not exist.
   */
  versions: (context: OwnershipContext) => Promise<Record<string, StoredVersion>>;
  /**
   * Optional. Deletes the resources from every space; ids that no longer exist are not errors.
   * Without it, an owned object that leaves the files is never deleted and stays owned. An
   * `isolated` kind must have it, to delete a resource from the space it was declared in before.
   */
  remove?: (context: OwnershipContext) => Promise<RemoveResult>;
}

interface ResourceKindFields<TResource> {
  /** Lowercase identifier used in file names, for example `data_view`; at most 100 characters. */
  readonly id: string;
  /**
   * Ids of kinds to apply first, such as the kinds this one references; each must be registered.
   * Kinds with `spaces: 'none'` always apply before the others, so they need not be named.
   */
  readonly dependsOn?: readonly string[];
  /** Throws when the document is invalid. */
  parse: (document: JsonValue) => TResource;
  /**
   * Identifies a resource within its space, so an id declared twice is rejected; errors `apply`
   * reports must carry the same id.
   */
  idOf: (resource: TResource) => string;
  /** Optional. Without it the kind is applied every run, but never owned or pruned. */
  readonly ownership?: ResourceOwnership;
  /**
   * Whether `apply` marks created objects managed when `managed` asks it to. Only then does a change
   * of that setting count as a change to the kind's resources, so they are written again.
   */
  readonly supportsManaged?: boolean;
  /**
   * Optional, only for the kind whose resources are the spaces themselves, which must have
   * `spaces: 'none'`. Tells whether a space exists, so the bootstrap can warn about resources
   * applied into a missing one; throws when the space cannot be looked up.
   */
  readonly spaceExists?: (spaceId: string) => Promise<boolean>;
}

/** How a kind applies its resources; `spaces` picks what `apply` receives. */
type ResourceKindApply<TResource> =
  | {
      /** A global kind: its documents cannot name `spaces`. */
      readonly spaces: 'none';
      /**
       * Settles every write before it returns or throws, as `applyEach` does, so the bootstrap can
       * read which objects it created.
       */
      apply: (context: GlobalApplyContext<TResource>) => Promise<ApplyResult>;
    }
  | {
      /**
       * `isolated` kinds take at most one space; `shared` kinds take several. Both default to the
       * `default` space.
       */
      readonly spaces: 'isolated' | 'shared';
      /**
       * Settles every write before it returns or throws, as `applyEach` does, so the bootstrap can
       * read which objects it created.
       */
      apply: (context: ApplyContext<TResource>) => Promise<ApplyResult>;
    };

/** A declarative resource type; `apply` must be an idempotent upsert that needs no user request. */
export type ResourceKind<TResource> = ResourceKindFields<TResource> & ResourceKindApply<TResource>;
