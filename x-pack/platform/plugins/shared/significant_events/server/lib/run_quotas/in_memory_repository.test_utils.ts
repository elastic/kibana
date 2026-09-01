/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { RunQuotaSavedObjectsRepository } from './repository';

interface StoredSavedObject {
  attributes: Record<string, unknown>;
  version: number;
}

const encodeVersion = (version: number): string => String(version);

export interface InMemoryRunQuotaRepository {
  client: RunQuotaSavedObjectsRepository & Pick<SavedObjectsClientContract, 'delete' | 'find'>;
  getAttributes: <T>(type: string, id: string) => T | undefined;
  seed: (type: string, id: string, attributes: Record<string, unknown>) => void;
}

export const createInMemoryRunQuotaRepository = (): InMemoryRunQuotaRepository => {
  const documents = new Map<string, StoredSavedObject>();
  const key = (type: string, id: string) => `${type}:${id}`;

  const client = {
    get: async <T>(type: string, id: string) => {
      const document = documents.get(key(type, id));
      if (!document) {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
      }
      return {
        type,
        id,
        attributes: structuredClone(document.attributes) as T,
        references: [],
        version: encodeVersion(document.version),
      };
    },
    create: async <T>(
      type: string,
      attributes: T,
      options: { id?: string; overwrite?: boolean } = {}
    ) => {
      await Promise.resolve();
      const id = options.id ?? randomUUID();
      const documentKey = key(type, id);
      if (documents.has(documentKey) && !options.overwrite) {
        throw SavedObjectsErrorHelpers.createConflictError(type, id);
      }
      const version = (documents.get(documentKey)?.version ?? 0) + 1;
      documents.set(documentKey, {
        attributes: structuredClone(attributes) as Record<string, unknown>,
        version,
      });
      return {
        type,
        id,
        attributes: structuredClone(attributes),
        references: [],
        version: encodeVersion(version),
      };
    },
    update: async <T>(
      type: string,
      id: string,
      attributes: Partial<T>,
      options: { version?: string } = {}
    ) => {
      await Promise.resolve();
      const documentKey = key(type, id);
      const current = documents.get(documentKey);
      if (!current) {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
      }
      if (options.version !== encodeVersion(current.version)) {
        throw SavedObjectsErrorHelpers.createConflictError(type, id);
      }
      const next = {
        ...current.attributes,
        ...(structuredClone(attributes) as Record<string, unknown>),
      };
      documents.set(documentKey, {
        attributes: next,
        version: current.version + 1,
      });
      return {
        type,
        id,
        attributes: structuredClone(next) as Partial<T>,
        references: [],
        version: encodeVersion(current.version + 1),
      };
    },
    delete: async (type: string, id: string) => {
      if (!documents.delete(key(type, id))) {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
      }
      return {};
    },
    find: async <T>({
      type,
      page = 1,
      perPage = 20,
      filter,
    }: {
      type: string;
      page?: number;
      perPage?: number;
      filter?: string;
    }) => {
      const filterMatch = filter?.match(/\.attributes\.([^ ]+) < "([^"]+)"/);
      const matches = [...documents.entries()]
        .filter(([documentKey, document]) => {
          if (!documentKey.startsWith(`${type}:`)) {
            return false;
          }
          if (!filterMatch) {
            return true;
          }
          const [, field, cutoff] = filterMatch;
          return String(document.attributes[field] ?? '') < cutoff;
        })
        .map(([documentKey, document]) => ({
          type,
          id: documentKey.slice(type.length + 1),
          attributes: structuredClone(document.attributes) as T,
          references: [],
          version: encodeVersion(document.version),
          score: 0,
        }));
      const start = (page - 1) * perPage;
      return {
        page,
        per_page: perPage,
        total: matches.length,
        saved_objects: matches.slice(start, start + perPage),
      };
    },
  } as RunQuotaSavedObjectsRepository & Pick<SavedObjectsClientContract, 'delete' | 'find'>;

  return {
    client,
    getAttributes: <T>(type: string, id: string): T | undefined => {
      const document = documents.get(key(type, id));
      return document ? (structuredClone(document.attributes) as T) : undefined;
    },
    seed: (type, id, attributes) => {
      documents.set(key(type, id), {
        attributes: structuredClone(attributes),
        version: 1,
      });
    },
  };
};
