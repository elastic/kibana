/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils/src/types';
import type { EnhancementsRegistry } from '@kbn/embeddable-plugin/common/enhancements/registry';
import type { StoredMapEmbeddableState } from './types';
import { MAP_SAVED_OBJECT_REF_NAME } from './get_transform_in';
import type { MapByValueState } from '../types';
import { injectReferences } from '../../migrations/references';
import { MAP_SAVED_OBJECT_TYPE } from '../../constants';

export function getTransformOut(transformEnhancementsOut: EnhancementsRegistry['transformOut']) {
  function transformOut(state: StoredMapEmbeddableState, references?: Reference[]) {
    const enhancementsState = state.enhancements
      ? transformEnhancementsOut(state.enhancements, references ?? [])
      : undefined;

    // by ref
    const savedObjectRef = (references ?? []).find(
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
        attributes: injectReferences({
          attributes: (state as MapByValueState).attributes,
          references: references ?? [],
        }).attributes,
      };
    }

    throw new Error('Unable to inject references from Map state, unexpected state');
  }
  return transformOut;
}
