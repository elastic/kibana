/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';

import type { LensDocument, ILensDocumentService } from '@kbn/lens-common';
import { LensClient } from './lens_client';
import type { LensSearchRequestQuery } from '../../server';

interface LensSaveResult {
  savedObjectId: string;
}

export class LensDocumentService implements ILensDocumentService {
  private client: LensClient;

  constructor(http: HttpStart) {
    this.client = new LensClient(http);
  }

  save = async (vis: LensDocument): Promise<LensSaveResult> => {
    // TODO: Flatten LenDocument types to align with new LensItem, for now just keep it.
    const { savedObjectId, references, ...attributes } = vis;

    if (savedObjectId) {
      const {
        item: { id },
      } = await this.client.update(savedObjectId, attributes, references);
      return { savedObjectId: id };
    }

    const {
      item: { id: newId },
    } = await this.client.create(attributes, references);

    return { savedObjectId: newId };
  };

  async load(savedObjectId: string) {
    return this.client.get(savedObjectId);
  }

  async search(options: LensSearchRequestQuery) {
    return this.client.search(options);
  }

  hasLibraryItemWithTitle = async (title: string): Promise<boolean> => {
    // Elasticsearch will return the most relevant results first, which means exact matches should come
    // first, and so we shouldn't need to request everything. Using 10 just to be on the safe side.
    const response = await this.search({
      perPage: 10,
      query: `"${title}"`,
      searchFields: ['title'],
    });

    return response.some((item) => item.title.toLowerCase() === title.toLowerCase());
  };
}
