/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import type { Reference } from '@kbn/content-management-utils';
import type { MapByReferenceState, MapByValueState, MapEmbeddableState } from '../types';
import type { StoredMapEmbeddableState } from './types';
import { MAP_SAVED_OBJECT_TYPE } from '../../constants';
import { transformMapAttributesIn } from '../../content_management/transform_map_attributes_in';

export const MAP_SAVED_OBJECT_REF_NAME = 'savedObjectRef';

export function getTransformIn(transformDrilldownsIn: DrilldownTransforms['transformIn']) {
  function transformIn(state: MapEmbeddableState): {
    state: StoredMapEmbeddableState;
    references: Reference[];
  } {
    const { state: storedState, references: drilldownReferences } = transformDrilldownsIn(state);

    // by ref
    if ((storedState as MapByReferenceState).savedObjectId) {
      const { savedObjectId, ...rest } = storedState as MapByReferenceState;
      return {
        state: {
          ...rest,
        } as StoredMapEmbeddableState,
        references: [
          {
            name: MAP_SAVED_OBJECT_REF_NAME,
            type: MAP_SAVED_OBJECT_TYPE,
            id: savedObjectId!,
          },
          ...drilldownReferences,
        ],
      };
    }

    // by value
    if ((storedState as MapByValueState).attributes) {
      const { attributes, references } = transformMapAttributesIn(
        (storedState as MapByValueState).attributes
      );

      return {
        state: {
          ...storedState,
          attributes,
        } as StoredMapEmbeddableState,
        references: [...references, ...drilldownReferences],
      };
    }

    return {
      state: {
        ...storedState,
      } as StoredMapEmbeddableState,
      references: drilldownReferences,
    };
  }
  return transformIn;
}
