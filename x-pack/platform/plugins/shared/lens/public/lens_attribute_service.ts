/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils';
import type { OnSaveProps } from '@kbn/saved-objects-plugin/public';
import type { SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';
import { noop } from 'lodash';
import type { HttpStart } from '@kbn/core/public';
import { LensDocumentService } from './persistence';
import { DOC_TYPE } from '../common/constants';
import type { SharingSavedObjectProps } from './types';
import type { LensSavedObjectAttributes } from './react_embeddable/types';

type CheckDuplicateTitleProps = OnSaveProps & {
  id?: string;
  displayName: string;
  lastSavedTitle: string;
  copyOnSave: boolean;
};

export interface LensAttributesService {
  loadFromLibrary: (savedObjectId: string) => Promise<{
    attributes: LensSavedObjectAttributes;
    sharingSavedObjectProps: SharingSavedObjectProps;
    managed: boolean;
  }>;
  saveToLibrary: (
    attributes: LensSavedObjectAttributes,
    references: Reference[],
    savedObjectId?: string
  ) => Promise<string>;
  checkForDuplicateTitle: (props: CheckDuplicateTitleProps) => Promise<{ isDuplicate: boolean }>;
}

export const savedObjectToEmbeddableAttributes = (
  savedObject: SavedObjectCommon<LensSavedObjectAttributes>
): LensSavedObjectAttributes => {
  return {
    ...savedObject.attributes,
    visualizationType: savedObject.attributes.visualizationType ?? null,
    state: savedObject.attributes.state as LensSavedObjectAttributes['state'],
    references: savedObject.references,
  };
};

export function getLensAttributeService(http: HttpStart): LensAttributesService {
  const lensDocumentService = new LensDocumentService(http);

  return {
    loadFromLibrary: async (
      savedObjectId: string
    ): Promise<{
      attributes: LensSavedObjectAttributes;
      sharingSavedObjectProps: SharingSavedObjectProps;
      managed: boolean;
    }> => {
      const { item, meta } = await lensDocumentService.load(savedObjectId);
      return {
        attributes: {
          ...item,
          state: item.state as LensSavedObjectAttributes['state'],
        },
        sharingSavedObjectProps: {
          aliasTargetId: meta.aliasTargetId,
          outcome: meta.outcome,
          aliasPurpose: meta.aliasPurpose,
          sourceId: item.id,
        },
        managed: Boolean(meta.managed),
      };
    },
    saveToLibrary: async (
      attributes: LensSavedObjectAttributes,
      references: Reference[],
      savedObjectId?: string
    ) => {
      const result = await lensDocumentService.save({
        ...attributes,
        state: attributes.state as LensSavedObjectAttributes['state'],
        references,
        savedObjectId,
      });
      return result.savedObjectId;
    },
    checkForDuplicateTitle: async ({
      newTitle,
      isTitleDuplicateConfirmed,
      onTitleDuplicate = noop,
      displayName = DOC_TYPE,
      lastSavedTitle = '',
      copyOnSave = false,
      id,
    }: CheckDuplicateTitleProps) => {
      return {
        isDuplicate: await lensDocumentService.checkForDuplicateTitle(
          {
            id,
            title: newTitle,
            isTitleDuplicateConfirmed,
            displayName,
            lastSavedTitle,
            copyOnSave,
          },
          onTitleDuplicate
        ),
      };
    },
  };
}
