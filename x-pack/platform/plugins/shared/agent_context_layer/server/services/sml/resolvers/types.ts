/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';

/**
 * Context passed to a resolver when fetching an item.
 *
 * The `esClient` and `savedObjectsClient` are scoped to the originating
 * request so that ES / saved-object permission checks happen naturally.
 */
export interface SmlResolverContext {
  esClient: IScopedClusterClient;
  savedObjectsClient: SavedObjectsClientContract;
  request: KibanaRequest;
  spaceId: string;
  logger: Logger;
}

/**
 * Resolved item returned by a resolver's `getItem` method.
 *
 * The shape is intentionally opaque to the SML layer — each resolver decides
 * what makes sense for its kind of resource (a saved object, an ES document,
 * an index mapping response, ...).
 */
export interface SmlResolverItem<T = unknown> {
  /** Resolver type that produced this item (e.g., `kibana`, `es_document`). */
  type: string;
  /** Resolver path (the part of `origin_id` after `<type>://`). */
  path: string;
  /** Underlying data returned by the resolver. */
  data: T;
}

/**
 * Definition of an SML resolver.
 *
 * Resolvers are responsible for two things:
 *   1. Computing the permissions required to access a resource identified by
 *      its `originPath` (used at indexing time to stamp the SML document
 *      with the permissions that gate it).
 *   2. Fetching the underlying resource on demand, scoped to the current
 *      user's request (used to convert SML hits into attachments or to
 *      read the raw resource without going through the SML index).
 *
 * Resolvers are registered against a `type` identifier which becomes the URI
 * scheme of `origin_id` values stamped on the SML documents that use them
 * (e.g. `kibana://lens/abc-123`, `es_document://my-index/doc-1`).
 */
export interface SmlResolver {
  /**
   * Resolver type identifier. Also used as the URI scheme prefix on the
   * `origin_id` field of SML documents (e.g. `kibana` → `kibana://...`).
   *
   * Must match `/^[a-z][a-z0-9_-]*$/`.
   */
  type: string;

  /**
   * Compute the permissions required to access the resource at `originPath`.
   * Called at indexing time; the returned values are stored on the SML
   * document and used to gate search results.
   *
   * Permission strings use a small DSL recognised by the SML service:
   *   - `kibana:<privilege>` (or any bare string without a recognised
   *     prefix) → Kibana feature/saved-object privilege.
   *   - `es-cluster:<privilege>` → Elasticsearch cluster privilege.
   *   - `es-index:<index>:<privilege>` → Elasticsearch index privilege.
   */
  getPermissions: (originPath: string) => string[] | Promise<string[]>;

  /**
   * Fetch the underlying resource, scoped to the user identified by
   * `context.request`. Implementations should rely on the scoped clients to
   * perform permission checks (the SML layer does not pre-check anything).
   *
   * Returns the resolved item, or `undefined` when the resource is missing
   * or the user is not authorized to read it.
   */
  getItem: (
    originPath: string,
    context: SmlResolverContext
  ) => Promise<SmlResolverItem | undefined>;
}

/**
 * Registry of SML resolvers. Lives on the agent_context_layer plugin and is
 * populated during the `setup` phase via the plugin's setup contract.
 */
export interface SmlResolverRegistry {
  /** Register a resolver. Throws if a resolver with the same `type` is already registered. */
  register(resolver: SmlResolver): void;
  /** Return `true` if a resolver with the given `type` is registered. */
  has(type: string): boolean;
  /** Get the resolver with the given `type`, or `undefined` if not registered. */
  get(type: string): SmlResolver | undefined;
  /** List all registered resolvers. */
  list(): SmlResolver[];
}
