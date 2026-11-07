/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils/src/types';
import { transformTimeRangeOut, transformTitlesOut } from '@kbn/presentation-publishing';
import { flow } from 'lodash';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import { MAP_SAVED_OBJECT_TYPE } from '../../constants';
import { transformMapAttributesOut } from '../../content_management/transform_map_attributes_out';
import { MAP_SAVED_OBJECT_REF_NAME } from './get_transform_in';
import { convertToSnakeCase } from '../../content_management/convert_keys';
import type { StoredMapEmbeddableState } from './types';

export function getTransformOut(transformDrilldownsOut: DrilldownTransforms['transformOut']) {
  function transformOut(
    storedState: StoredMapEmbeddableState,
    panelReferences?: Reference[],
    containerReferences?: Reference[]
  ) {
    const transformsFlow = flow(
      transformTitlesOut<StoredMapEmbeddableState>,
      transformTimeRangeOut<StoredMapEmbeddableState>,
      (state: StoredMapEmbeddableState) => transformDrilldownsOut(state, panelReferences)
    );
    const transformedState = transformsFlow(storedState);
    // Stored map settings are camelCase, API map settings are snake_case
    const state =
      'mapSettings' in transformedState && transformedState.mapSettings
        ? { ...transformedState, mapSettings: convertToSnakeCase(transformedState.mapSettings) }
        : transformedState;

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
    if ('attributes' in state && state.attributes) {
      return {
        ...state,
        attributes: transformMapAttributesOut(state.attributes, (targetName: string) => {
          const panelRef = (panelReferences ?? []).find(({ name }) => name === targetName);
          if (panelRef) return panelRef;

          return (containerReferences ?? []).find(({ name }) => name === targetName);
        }),
      };
    }

    return state;
  }
  return transformOut;
}
