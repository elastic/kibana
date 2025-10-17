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
import type { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import { extract, inject } from '../common/embeddable_factory';
import { LensDocumentService } from './persistence';
import { DOC_TYPE } from '../common/constants';
import type { SharingSavedObjectProps } from './types';
import type { LensRuntimeState, LensSavedObjectAttributes } from './react_embeddable/types';

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
  injectReferences: (
    runtimeState: LensRuntimeState,
    references: Reference[] | undefined
  ) => LensRuntimeState;
  extractReferences: (runtimeState: LensRuntimeState) => {
    rawState: LensRuntimeState;
    references: Reference[];
  };
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
