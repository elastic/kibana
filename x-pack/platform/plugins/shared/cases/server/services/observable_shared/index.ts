/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { v5 as uuidv5 } from 'uuid';
import type { estypes } from '@elastic/elasticsearch';
import type {
  ISavedObjectsSerializer,
  Logger,
  SavedObjectsClientContract,
  SavedObjectsRawDoc,
  SavedObjectsRawDocSource,
} from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  CASE_OBSERVABLE_SHARED_SAVED_OBJECT,
  MAX_OBSERVABLE_METADATA_PAIRS,
} from '../../../common/constants';
import type {
  ObservableMetadata,
  ObservableSharedPersistedAttributes,
} from '../../common/types/observable_shared';
import type { User } from '../../common/types/user';
import type { ObservableKey } from '../observables';
import { keysQuery, observableKey } from '../observables';

/** Fixed namespace for shared object ids; changing it would change every derived id. */
const OBSERVABLE_SHARED_ID_NAMESPACE = '6f0c1b0e-5f0a-4a43-9a1f-2c9e5c3e7d11';

const MAX_WRITE_ATTEMPTS = 3;

/** Largest page one lookup by type key and value reads. */
const LOOKUP_PAGE_SIZE = 5_000;

/** A metadata filter of the observables list: a key's value, a value prefix, or a key's presence. */
export interface ObservableMetadataFilter {
  key: string;
  /** Matches the whole value, ignoring case. */
  value?: string;
  /** Matches the start of the value, ignoring case. */
  prefix?: string;
}

export interface SharedObservable extends ObservableKey {
  id: string;
  version?: string;
  owner: string;
  metadata: ObservableMetadata;
}

interface ObservableSharedServiceContext {
  log: Logger;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  savedObjectsSerializer: ISavedObjectsSerializer;
  /** The namespace of the request's space; every search runs in it. */
  namespace: string;
}

const sharedField = (name: string): string => `${CASE_OBSERVABLE_SHARED_SAVED_OBJECT}.${name}`;

/**
 * Id of the first shared object of a value. The space is part of it because the Elasticsearch id
 * of a multiple-isolated object carries no space. Only the first write uses it, so two concurrent
 * first writes collide; every other read finds the object by owner, type key and value.
 */
export const deriveSharedObservableId = ({
  namespace,
  owner,
  typeKey,
  value,
}: ObservableKey & { namespace: string; owner: string }): string =>
  uuidv5([namespace, owner, typeKey, value].join('\u0000'), OBSERVABLE_SHARED_ID_NAMESPACE);

/** The query of one metadata filter over the flattened `metadata` field. */
export const metadataFilterQuery = ({
  key,
  value,
  prefix,
}: ObservableMetadataFilter): estypes.QueryDslQueryContainer => {
  const field = sharedField(`metadata.${key}`);

  if (value != null) {
    return { term: { [field]: { value, case_insensitive: true } } };
  }

  if (prefix != null) {
    return { prefix: { [field]: { value: prefix, case_insensitive: true } } };
  }

  return { exists: { field } };
};

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    chunks.push(items.slice(start, start + size));
  }
  return chunks;
};

const ensureWithinLimit = (metadata: ObservableMetadata) => {
  if (Object.keys(metadata).length > MAX_OBSERVABLE_METADATA_PAIRS) {
    throw Boom.badRequest(
      `An observable value holds at most ${MAX_OBSERVABLE_METADATA_PAIRS} metadata pairs.`
    );
  }
};

/**
 * Reads and writes `cases-observable-shared` objects: what is true of an observable value in every
 * case of a space and owner. Callers authorize the case they act from before they reach the
 * service.
 */
export class ObservableSharedService {
  constructor(private readonly context: ObservableSharedServiceContext) {}

  private toSharedObservable(
    hit: estypes.SearchHit<SavedObjectsRawDocSource> | SavedObjectsRawDoc
  ): SharedObservable {
    const { id, version, attributes } =
      this.context.savedObjectsSerializer.rawToSavedObject<ObservableSharedPersistedAttributes>(
        hit as SavedObjectsRawDoc
      );

    return {
      id,
      version,
      owner: attributes.owner,
      typeKey: attributes.type_key,
      value: attributes.value,
      metadata: attributes.metadata ?? {},
    };
  }

  /**
   * The shared objects of the values, by their repeat key. When an import left two objects for one
   * value, the most recently updated wins.
   */
  public async findByKeys(
    owner: string,
    keys: ObservableKey[]
  ): Promise<Map<string, SharedObservable>> {
    const shared = new Map<string, SharedObservable>();
    if (keys.length === 0) {
      return shared;
    }

    for (const keysChunk of chunk(keys, LOOKUP_PAGE_SIZE)) {
      const response =
        await this.context.unsecuredSavedObjectsClient.search<SavedObjectsRawDocSource>({
          type: CASE_OBSERVABLE_SHARED_SAVED_OBJECT,
          namespaces: [this.context.namespace],
          size: keysChunk.length * 2,
          seq_no_primary_term: true,
          sort: [
            { [sharedField('updated_at')]: { order: 'desc', missing: '_last' } },
            { [sharedField('created_at')]: { order: 'desc' } },
          ],
          query: {
            bool: {
              filter: [
                { term: { [sharedField('owner')]: owner } },
                keysQuery(keysChunk, sharedField),
              ],
            },
          },
        });

      for (const hit of response.hits.hits) {
        const sharedObservable = this.toSharedObservable(hit);
        const key = observableKey(sharedObservable);
        if (!shared.has(key)) {
          shared.set(key, sharedObservable);
        }
      }
    }

    return shared;
  }

  /**
   * Sets the metadata of a value. `merge` overwrites the keys it names and keeps the others;
   * `replace` sets exactly the given pairs, and `null` or `{}` clears them. The object is created
   * on its first write, under the derived id; later writes send its version and retry on a
   * conflict, so a concurrent write is never lost.
   */
  public async writeMetadata({
    owner,
    typeKey,
    value,
    metadata,
    mode,
    user,
  }: ObservableKey & {
    owner: string;
    metadata: ObservableMetadata | null;
    mode: 'merge' | 'replace';
    user: User;
  }): Promise<SharedObservable | undefined> {
    const { unsecuredSavedObjectsClient, namespace } = this.context;
    const key = observableKey({ typeKey, value });

    for (let attempt = 1; attempt <= MAX_WRITE_ATTEMPTS; attempt++) {
      const existing = (await this.findByKeys(owner, [{ typeKey, value }])).get(key);
      const nextMetadata =
        mode === 'merge' ? { ...(existing?.metadata ?? {}), ...(metadata ?? {}) } : metadata ?? {};
      ensureWithinLimit(nextMetadata);

      const now = new Date().toISOString();

      try {
        if (existing == null) {
          // Nothing to keep: a value without metadata needs no shared object yet.
          if (Object.keys(nextMetadata).length === 0) {
            return;
          }

          const created =
            await unsecuredSavedObjectsClient.create<ObservableSharedPersistedAttributes>(
              CASE_OBSERVABLE_SHARED_SAVED_OBJECT,
              {
                owner,
                type_key: typeKey,
                value,
                metadata: nextMetadata,
                created_at: now,
                created_by: user,
                updated_at: null,
                updated_by: null,
              },
              {
                id: deriveSharedObservableId({ namespace, owner, typeKey, value }),
                overwrite: false,
                refresh: 'wait_for',
              }
            );

          return {
            id: created.id,
            version: created.version,
            owner,
            typeKey,
            value,
            metadata: nextMetadata,
          };
        }

        const updated =
          await unsecuredSavedObjectsClient.update<ObservableSharedPersistedAttributes>(
            CASE_OBSERVABLE_SHARED_SAVED_OBJECT,
            existing.id,
            {
              owner,
              type_key: typeKey,
              value,
              metadata: nextMetadata,
              updated_at: now,
              updated_by: user,
            },
            // A partial update would merge the flattened metadata with the stored keys, so
            // removed keys would stay; the full update replaces them.
            { version: existing.version, refresh: 'wait_for', mergeAttributes: false }
          );

        return { ...existing, version: updated.version, metadata: nextMetadata };
      } catch (error) {
        if (!SavedObjectsErrorHelpers.isConflictError(error as Error)) {
          throw error;
        }
        this.context.log.debug(
          `Retrying the metadata write of an observable value after a conflict (attempt ${attempt})`
        );
      }
    }

    throw Boom.conflict(
      `The metadata of the observable value was modified concurrently ${MAX_WRITE_ATTEMPTS} times in a row. Retry the request.`
    );
  }

  /**
   * The type keys and values whose metadata matches every filter, at most `cap` of them. The cost
   * follows how many values of the space and owner match, not the size of a case.
   */
  public async findKeysByMetadata({
    owner,
    filters,
    cap,
  }: {
    owner: string;
    filters: ObservableMetadataFilter[];
    cap: number;
  }): Promise<ObservableKey[]> {
    const response =
      await this.context.unsecuredSavedObjectsClient.search<SavedObjectsRawDocSource>({
        type: CASE_OBSERVABLE_SHARED_SAVED_OBJECT,
        namespaces: [this.context.namespace],
        size: cap,
        query: {
          bool: {
            filter: [
              { term: { [sharedField('owner')]: owner } },
              ...filters.map(metadataFilterQuery),
            ],
          },
        },
      });

    if (response.hits.hits.length === cap) {
      this.context.log.debug(
        `A metadata filter matched at least ${cap} observable values; only the first ${cap} are used`
      );
    }

    return response.hits.hits.map((hit) => {
      const { typeKey, value } = this.toSharedObservable(hit);
      return { typeKey, value };
    });
  }
}
