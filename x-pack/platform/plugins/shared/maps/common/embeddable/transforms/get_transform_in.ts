/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EnhancementsRegistry } from '@kbn/embeddable-plugin/common/enhancements/registry';
import type { Reference } from '@kbn/content-management-utils';
import type { MapByReferenceState, MapByValueState, MapEmbeddableState } from '../types';
import type { StoredMapEmbeddableState } from './types';
import { MAP_SAVED_OBJECT_TYPE } from '../../constants';
import { transformMapAttributesIn } from '../../content_management/transform_map_attributes_in';

export const MAP_SAVED_OBJECT_REF_NAME = 'savedObjectRef';

export function getTransformIn(transformEnhancementsIn: EnhancementsRegistry['transformIn']) {
  function transformIn(state: MapEmbeddableState): {
    state: StoredMapEmbeddableState;
    references: Reference[];
  } {
    const { enhancementsState, enhancementsReferences } = state.enhancements
      ? transformEnhancementsIn(state.enhancements)
      : { enhancementsState: undefined, enhancementsReferences: [] };

    // by ref
    if ((state as MapByReferenceState).savedObjectId) {
      const { savedObjectId, ...rest } = state as MapByReferenceState;
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
    if ((state as MapByValueState).attributes) {
      const { attributes, references } = transformMapAttributesIn(
        (state as MapByValueState).attributes
      );

      return {
        state: {
          ...state,
          ...(enhancementsState ? { enhancements: enhancementsState } : {}),
          attributes,
        } as StoredMapEmbeddableState,
        references: [...references, ...enhancementsReferences],
      };
    }

    return {
      state: {
        ...state,
        ...(enhancementsState ? { enhancements: enhancementsState } : {}),
      } as StoredMapEmbeddableState,
      references: enhancementsReferences,
    };
  }
  return transformIn;
}
