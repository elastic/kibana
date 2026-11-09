/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { SOURCE_TYPES, SCALING_TYPES } from '../constants';
import type { StoredLayer } from './stored_layer';
import type { StoredMapAttributes } from '../../server';

function isEsDocumentSource(layerDescriptor: StoredLayer) {
  const sourceType = _.get(layerDescriptor, 'sourceDescriptor.type');
  return sourceType === SOURCE_TYPES.ES_SEARCH;
}

export function migrateUseTopHitsToScalingType({
  attributes,
}: {
  attributes: StoredMapAttributes;
}): StoredMapAttributes {
  if (!attributes || !attributes.layerListJSON) {
    return attributes;
  }

  let layerList: StoredLayer[] = [];
  try {
    layerList = JSON.parse(attributes.layerListJSON);
  } catch (e) {
    throw new Error('Unable to parse attribute layerListJSON');
  }

  layerList.forEach((layerDescriptor) => {
    if (isEsDocumentSource(layerDescriptor)) {
      const sourceDescriptor = layerDescriptor.sourceDescriptor!;
      sourceDescriptor.scalingType = _.get(layerDescriptor, 'sourceDescriptor.useTopHits', false)
        ? SCALING_TYPES.TOP_HITS
        : SCALING_TYPES.LIMIT;
      delete sourceDescriptor.useTopHits;
    }
  });

  return {
    ...attributes,
    layerListJSON: JSON.stringify(layerList),
  };
}
