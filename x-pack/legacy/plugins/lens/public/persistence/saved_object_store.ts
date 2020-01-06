/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { SavedObjectAttributes } from 'src/core/server';
import { Query, esFilters } from '../../../../../../src/plugins/data/public';

export interface Document {
  id?: string;
  type?: string;
  visualizationType: string | null;
  title: string;
  expression: string | null;
  state: {
    datasourceMetaData: {
      filterableIndexPatterns: Array<{ id: string; title: string }>;
    };
    datasourceStates: Record<string, unknown>;
    visualization: unknown;
    query: Query;
    filters: esFilters.Filter[];
  };
}

export const DOC_TYPE = 'lens';

interface SavedObjectClient {
  create: (type: string, object: SavedObjectAttributes) => Promise<{ id: string }>;
  update: (type: string, id: string, object: SavedObjectAttributes) => Promise<{ id: string }>;
  get: (
    type: string,
    id: string
  ) => Promise<{
    id: string;
    type: string;
    attributes: SavedObjectAttributes;
    error?: { statusCode: number; message: string };
  }>;
}

export interface DocumentSaver {
  save: (vis: Document) => Promise<{ id: string }>;
}

export interface DocumentLoader {
  load: (id: string) => Promise<Document>;
}

export type SavedObjectStore = DocumentLoader & DocumentSaver;

export class SavedObjectIndexStore implements SavedObjectStore {
  private client: SavedObjectClient;

  constructor(client: SavedObjectClient) {
    this.client = client;
  }

  async save(vis: Document) {
    const { id, type, ...rest } = vis;
    // TODO: SavedObjectAttributes should support this kind of object,
    // remove this workaround when SavedObjectAttributes is updated.
    const attributes = (rest as unknown) as SavedObjectAttributes;
    const result = await (id
      ? this.client.update(DOC_TYPE, id, attributes)
      : this.client.create(DOC_TYPE, attributes));

    return { ...vis, id: result.id };
  }

  async load(id: string): Promise<Document> {
    const { type, attributes, error } = await this.client.get(DOC_TYPE, id);

    if (error) {
      throw error;
    }

    return {
      ...attributes,
      id,
      type,
    } as Document;
  }
}
