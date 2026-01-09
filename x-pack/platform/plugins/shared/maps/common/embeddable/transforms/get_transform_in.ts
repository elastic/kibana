/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils';
import type { EnhancementsRegistry } from '@kbn/embeddable-plugin/common/enhancements/registry';
import { transformTitlesIn } from '@kbn/presentation-publishing';
import { MAP_SAVED_OBJECT_TYPE } from '../../constants';
import { transformMapAttributesIn } from '../../content_management/transform_map_attributes_in';
import type { MapByReferenceState, MapByValueState, MapEmbeddableState } from '../types';
import type { StoredMapEmbeddableState } from './types';

export const MAP_SAVED_OBJECT_REF_NAME = 'savedObjectRef';

export function getTransformIn(transformEnhancementsIn: EnhancementsRegistry['transformIn']) {
  function transformIn(state: MapEmbeddableState): {
    state: StoredMapEmbeddableState;
    references: Reference[];
  } {
    const stateWithStoredTitles = transformTitlesIn(state);
    const { enhancementsState, enhancementsReferences } = stateWithStoredTitles.enhancements
      ? transformEnhancementsIn(stateWithStoredTitles.enhancements)
      : { enhancementsState: undefined, enhancementsReferences: [] };

    // by ref
    if ((stateWithStoredTitles as MapByReferenceState).savedObjectId) {
      const { savedObjectId, ...rest } = stateWithStoredTitles as MapByReferenceState;
      return {
        state: {
          ...rest,
          ...(enhancementsState ? { enhancements: enhancementsState } : {}),
        } as StoredMapEmbeddableState,
        references: [
          {
            name: MAP_SAVED_OBJECT_REF_NAME,
            type: MAP_SAVED_OBJECT_TYPE,
            id: savedObjectId!,
          },
          ...enhancementsReferences,
        ],
      };
    }

    // by value
    if ((stateWithStoredTitles as MapByValueState).attributes) {
      const { attributes, references } = transformMapAttributesIn(
        (stateWithStoredTitles as MapByValueState).attributes
      );

      return {
        state: {
          ...stateWithStoredTitles,
          ...(enhancementsState ? { enhancements: enhancementsState } : {}),
          attributes,
        } as StoredMapEmbeddableState,
        references: [...references, ...enhancementsReferences],
      };
    }

    return {
      state: {
        ...stateWithStoredTitles,
        ...(enhancementsState ? { enhancements: enhancementsState } : {}),
      } as StoredMapEmbeddableState,
      references: enhancementsReferences,
    };
  }
  return transformIn;
}
