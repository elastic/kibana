/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils';
import type { SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';
import { noop } from 'lodash';
import type { HttpStart } from '@kbn/core/public';
import type {
  SharingSavedObjectProps,
  LensSavedObjectAttributes,
  CheckDuplicateTitleProps,
  LensAttributesService,
} from '@kbn/lens-common';
import { LensDocumentService } from './persistence';
import { DOC_TYPE } from '../common/constants';

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
      // The item.id property returned from lensDocumentService.load is the savedObjectId
      const {
        item: { id, ...attributesWithoutId },
        meta,
      } = await lensDocumentService.load(savedObjectId);

      // TypeScript's excess property checking doesn't catch extra properties in spreads
      const attributes = ensureExactAttributes({
        ...attributesWithoutId,
        state: attributesWithoutId.state satisfies LensSavedObjectAttributes['state'],
      });

      return {
        attributes,
        sharingSavedObjectProps: {
          aliasTargetId: meta.aliasTargetId,
          outcome: meta.outcome,
          aliasPurpose: meta.aliasPurpose,
          sourceId: id,
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

function ensureExactAttributes<T extends LensSavedObjectAttributes>(
  attrs: T & Record<Exclude<keyof T, keyof LensSavedObjectAttributes>, never>
): LensSavedObjectAttributes {
  return attrs;
}
