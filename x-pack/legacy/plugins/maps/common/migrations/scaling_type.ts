/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { ES_SEARCH, SCALING_TYPES } from '../constants';
import { LayerDescriptor } from '../descriptor_types';
import { MapSavedObject } from '../map_saved_object_types';

function isEsDocumentSource(layerDescriptor: LayerDescriptor) {
  const sourceType = _.get(layerDescriptor, 'sourceDescriptor.type');
  return sourceType === ES_SEARCH;
}

export function migrateUseTopHitsToScalingType({ attributes }: Partial<MapSavedObject>) {
  if (!attributes || !attributes.layerListJSON) {
    return attributes;
  }

  const layerList: LayerDescriptor[] = JSON.parse(attributes.layerListJSON);
  layerList.forEach((layerDescriptor: LayerDescriptor) => {
    if (isEsDocumentSource(layerDescriptor)) {
      if (_.has(layerDescriptor, 'sourceDescriptor.useTopHits')) {
        // @ts-ignore TS is too stupid to figure out that scalingType is available on sourceDescriptor
        layerDescriptor.sourceDescriptor.scalingType = _.get(
          layerDescriptor,
          'sourceDescriptor.useTopHits',
          false
        )
          ? SCALING_TYPES.TOP_HITS
          : SCALING_TYPES.LIMIT;
        // @ts-ignore useTopHits no longer in type definition but that does not mean its not in live data
        // hence the entire point of this method
        delete layerDescriptor.sourceDescriptor.useTopHits;
      }
    }
  });

  return {
    ...attributes,
    layerListJSON: JSON.stringify(layerList),
  };
}
