/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils/src/types';
import { transformTitlesOut } from '@kbn/presentation-publishing';
import { flow } from 'lodash';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import { MAP_SAVED_OBJECT_TYPE } from '../../constants';
import { transformMapAttributesOut } from '../../content_management/transform_map_attributes_out';
import type { MapByValueState } from '../types';
import { MAP_SAVED_OBJECT_REF_NAME } from './get_transform_in';
import type { StoredMapEmbeddableState } from './types';

export function getTransformOut(transformDrilldownsOut: DrilldownTransforms['transformOut']) {
  function transformOut(
    storedState: StoredMapEmbeddableState,
    panelReferences?: Reference[],
    containerReferences?: Reference[]
  ) {
    const transformsFlow = flow(
      transformTitlesOut<StoredMapEmbeddableState>,
      (state: StoredMapEmbeddableState) => transformDrilldownsOut(state, panelReferences)
    );
    const state = transformsFlow(storedState);

    // by ref
    const savedObjectRef = (panelReferences ?? []).find(
      (ref) => MAP_SAVED_OBJECT_TYPE === ref.type && ref.name === MAP_SAVED_OBJECT_REF_NAME
    );
    if (savedObjectRef) {
      return {
        ...state,
        savedObjectId: savedObjectRef.id,
      };
    }

    // by value
    if ((state as MapByValueState).attributes) {
      return {
        ...state,
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

    return state;
  }
  return transformOut;
}
