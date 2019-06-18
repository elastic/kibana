/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectAttributes } from 'target/types/server';

export interface LensDocument {
  id?: string;
  type?: string;
  visualizationType: string | null;
  datasourceType: string | null;
  title: string;
  lensState: {
    datasource: unknown;
    visualization: unknown;
  };
}

interface SavedObectStore {
  create: (type: string, object: SavedObjectAttributes) => Promise<{ id: string }>;
  update: (type: string, id: string, object: SavedObjectAttributes) => Promise<{ id: string }>;
  get: (
    type: string,
    id: string
  ) => Promise<{ id: string; type: string; attributes: SavedObjectAttributes }>;
}

const DOC_TYPE = 'lens';

export interface LensDocumentSaver {
  save: (vis: LensDocument) => Promise<{ id: string }>;
}

export interface LensDocumentLoader {
  load: (id: string) => Promise<LensDocument>;
}

export type LensStore = LensDocumentLoader & LensDocumentSaver;

export class LensSavedObjectStore {
  private client: SavedObectStore;

  constructor(client: SavedObectStore) {
    this.client = client;
  }

  async save(vis: LensDocument) {
    const { id, type, ...rest } = vis;
    const attributes = {
      ...rest,
      lensState: JSON.stringify(rest.lensState),
    };
    const result = await (id
      ? this.client.update(DOC_TYPE, id, attributes)
      : this.client.create(DOC_TYPE, attributes));

    return {
      ...vis,
      id: result.id,
    };
  }

  async load(id: string): Promise<LensDocument> {
    const { type, attributes } = await this.client.get(DOC_TYPE, id);

    return {
      ...attributes,
      id,
      type,
      lensState: JSON.parse(((attributes as unknown) as { lensState: string }).lensState as string),
    } as LensDocument;
  }
}
