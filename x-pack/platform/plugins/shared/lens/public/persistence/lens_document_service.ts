/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';

import type {
  LensDocument,
  ILensDocumentService,
  CheckDuplicateTitleOptions,
} from '@kbn/lens-common';
import { LensClient } from './lens_client';
import { SAVE_DUPLICATE_REJECTED } from './constants';
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

  /**
   * check for an existing saved object with the same title in ES
   * returns Promise<true> when it's no duplicate, or the modal displaying the warning
   * that's there's a duplicate is confirmed, else it returns a rejected Promise<ErrorMsg>
   */
  async checkForDuplicateTitle(
    {
      id,
      title,
      isTitleDuplicateConfirmed,
      lastSavedTitle,
      copyOnSave,
    }: CheckDuplicateTitleOptions,
    onTitleDuplicate: () => void
  ): Promise<boolean> {
    // Don't check for duplicates if user has already confirmed save with duplicate title
    if (isTitleDuplicateConfirmed) {
      return true;
    }

    // Don't check if the user isn't updating the title, otherwise that would become very annoying to have
    // to confirm the save every time, except when copyOnSave is true, then we do want to check.
    if (title === lastSavedTitle && !copyOnSave) {
      return true;
    }

    // Elasticsearch will return the most relevant results first, which means exact matches should come
    // first, and so we shouldn't need to request everything. Using 10 just to be on the safe side.
    const response = await this.search({
      perPage: 10,
      query: `"${title}"`,
      searchFields: ['title'],
    });

    const duplicate = response.find((item) => item.title.toLowerCase() === title.toLowerCase());

    if (!duplicate || duplicate.id === id) {
      return true;
    }

    onTitleDuplicate();

    return Promise.reject(new Error(SAVE_DUPLICATE_REJECTED));
  }
}
