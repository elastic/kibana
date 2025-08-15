/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { SearchQuery } from '@kbn/content-management-plugin/common';
import type { VisualizationClient } from '@kbn/visualizations-plugin/public';

import type { LensSavedObjectAttributes, LensSearchQuery } from '../../common/content_management';
import { getLensClient } from './lens_client';
import { SAVE_DUPLICATE_REJECTED } from './constants';
import type { LensDocument } from './types';

export interface CheckDuplicateTitleOptions {
  id?: string;
  title: string;
  displayName: string;
  lastSavedTitle: string;
  copyOnSave: boolean;
  isTitleDuplicateConfirmed: boolean;
}

interface ILensDocumentService {
  save: (vis: LensDocument) => Promise<{ savedObjectId: string }>;
  load: (savedObjectId: string) => Promise<unknown>;
  checkForDuplicateTitle: (
    options: CheckDuplicateTitleOptions,
    onTitleDuplicate: () => void
  ) => Promise<boolean>;
}

export class LensDocumentService implements ILensDocumentService {
  private client: VisualizationClient<'lens', LensSavedObjectAttributes>;

  constructor(cm: ContentManagementPublicStart) {
    this.client = getLensClient(cm);
  }

  save = async (vis: LensDocument) => {
    const { savedObjectId, type, references, ...attributes } = vis;

    if (savedObjectId) {
      const result = await this.client.update({
        id: savedObjectId,
        data: attributes,
        options: {
          references,
        },
      });
      return { ...vis, savedObjectId: result.item.id };
    }
    const result = await this.client.create({
      data: attributes,
      options: {
        references,
      },
    });
    return { ...vis, savedObjectId: result.item.id };
  };

  async load(savedObjectId: string) {
    const resolveResult = await this.client.get(savedObjectId);

    if (resolveResult.item.error) {
      throw resolveResult.item.error;
    }

    return resolveResult;
  }

  async search(query: SearchQuery, options: LensSearchQuery) {
    const result = await this.client.search(query, options);
    return result;
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
    const response = await this.search(
      {
        limit: 10,
        text: `"${title}"`,
      },
      {
        searchFields: ['title'],
      }
    );
    const duplicate = response.hits.find(
      (obj) => obj.attributes.title.toLowerCase() === title.toLowerCase()
    );

    if (!duplicate || duplicate.id === id) {
      return true;
    }

    onTitleDuplicate();

    return Promise.reject(new Error(SAVE_DUPLICATE_REJECTED));
  }
}
