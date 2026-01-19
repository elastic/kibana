/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils/src/types';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import type { StoredMapEmbeddableState } from './types';
import { MAP_SAVED_OBJECT_REF_NAME } from './get_transform_in';
import type { MapByValueState } from '../types';
import { MAP_SAVED_OBJECT_TYPE } from '../../constants';
import { transformMapAttributesOut } from '../../content_management/transform_map_attributes_out';

export function getTransformOut(
  transformEnhancementsOut: EmbeddableSetup['transformEnhancementsOut']
) {
  function transformOut(
    state: StoredMapEmbeddableState,
    panelReferences?: Reference[],
    containerReferences?: Reference[]
  ) {
    const enhancementsState = state.enhancements
      ? transformEnhancementsOut(state.enhancements, panelReferences ?? [])
      : undefined;

    // by ref
    const savedObjectRef = (panelReferences ?? []).find(
      (ref) => MAP_SAVED_OBJECT_TYPE === ref.type && ref.name === MAP_SAVED_OBJECT_REF_NAME
    );
    if (savedObjectRef) {
      return {
        ...state,
        ...(enhancementsState ? { enhancements: enhancementsState } : {}),
        savedObjectId: savedObjectRef.id,
      };
    }

    // by value
    if ((state as MapByValueState).attributes) {
      return {
        ...state,
        ...(enhancementsState ? { enhancements: enhancementsState } : {}),
        attributes: transformMapAttributesOut(
          (state as MapByValueState).attributes,
          (targetName: string) => {
            const panelRef = (panelReferences ?? []).find(({ name }) => name === targetName);
            if (panelRef) return panelRef;

            return (containerReferences ?? []).find(({ name }) => name === targetName);
          }
        ),
      };
    }

    return {
      ...state,
      ...(enhancementsState ? { enhancements: enhancementsState } : {}),
    };
  }
  return transformOut;
}
