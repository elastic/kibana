/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils/src/types';
import type { EnhancementsRegistry } from '@kbn/embeddable-plugin/common/enhancements/registry';
import { transformTitlesOut } from '@kbn/presentation-publishing-schemas';
import { MAP_SAVED_OBJECT_TYPE } from '../../constants';
import { transformMapAttributesOut } from '../../content_management/transform_map_attributes_out';
import type { MapByValueState } from '../types';
import { MAP_SAVED_OBJECT_REF_NAME } from './get_transform_in';
import type { StoredMapEmbeddableState } from './types';

export function getTransformOut(transformEnhancementsOut: EnhancementsRegistry['transformOut']) {
  function transformOut(state: StoredMapEmbeddableState, references?: Reference[]) {
    const stateWithApiTitles = transformTitlesOut(state);
    const enhancementsState = stateWithApiTitles.enhancements
      ? transformEnhancementsOut(stateWithApiTitles.enhancements, references ?? [])
      : undefined;

    // by ref
    const savedObjectRef = (references ?? []).find(
      (ref) => MAP_SAVED_OBJECT_TYPE === ref.type && ref.name === MAP_SAVED_OBJECT_REF_NAME
    );
    if (savedObjectRef) {
      return {
        ...stateWithApiTitles,
        ...(enhancementsState ? { enhancements: enhancementsState } : {}),
        savedObjectId: savedObjectRef.id,
      };
    }

    // by value
    if ((stateWithApiTitles as MapByValueState).attributes) {
      return {
        ...stateWithApiTitles,
        ...(enhancementsState ? { enhancements: enhancementsState } : {}),
        attributes: transformMapAttributesOut(
          (stateWithApiTitles as MapByValueState).attributes,
          references ?? []
        ),
      };
    }

    return {
      ...stateWithApiTitles,
      ...(enhancementsState ? { enhancements: enhancementsState } : {}),
    };
  }
  return transformOut;
}
