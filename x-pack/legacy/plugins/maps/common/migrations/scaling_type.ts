/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { ES_SEARCH, SCALING_TYPES } from '../constants';
import { LayerDescriptor, ESSearchSourceDescriptor } from '../descriptor_types';

function isEsDocumentSource(layerDescriptor: LayerDescriptor) {
  const sourceType = _.get(layerDescriptor, 'sourceDescriptor.type');
  return sourceType === ES_SEARCH;
}

export function migrateUseTopHitsToScalingType({
  attributes,
}: {
  attributes: { layerListJSON?: string; title?: string };
}) {
  if (!attributes || !attributes.layerListJSON) {
    return attributes;
  }

  const layerList: LayerDescriptor[] = JSON.parse(attributes.layerListJSON);
  layerList.forEach((layerDescriptor: LayerDescriptor) => {
    if (isEsDocumentSource(layerDescriptor)) {
      if (_.has(layerDescriptor, 'sourceDescriptor.useTopHits')) {
        const sourceDescriptor = layerDescriptor.sourceDescriptor as ESSearchSourceDescriptor;
        sourceDescriptor.scalingType = _.get(layerDescriptor, 'sourceDescriptor.useTopHits', false)
          ? SCALING_TYPES.TOP_HITS
          : SCALING_TYPES.LIMIT;
        // @ts-ignore useTopHits no longer in type definition but that does not mean its not in live data
        // hence the entire point of this method
        delete sourceDescriptor.useTopHits;
      }
    }
  });

  return {
    ...attributes,
    layerListJSON: JSON.stringify(layerList),
  };
}
