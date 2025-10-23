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
import type { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import type {
  SharingSavedObjectProps,
  LensRuntimeState,
  LensSavedObjectAttributes,
  CheckDuplicateTitleProps,
  LensAttributesService,
} from '@kbn/lens-common';
import { extract, inject } from '../common/embeddable_factory';
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
    // Make sure to inject references from the container down to the runtime state
    // this ensure migrations/copy to spaces works correctly
    injectReferences: (runtimeState, references) => {
      return inject(
        runtimeState as unknown as EmbeddableStateWithType,
        references ?? runtimeState.attributes.references
      ) as unknown as LensRuntimeState;
    },
    // Make sure to move the internal references into the parent references
    // so migrations/move to spaces can work properly
    extractReferences: (runtimeState) => {
      const { state, references } = extract(runtimeState as unknown as EmbeddableStateWithType);
      return { rawState: state as unknown as LensRuntimeState, references };
    },
  };
}
