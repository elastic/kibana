/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import {
  ES_GEO_GRID,
  ES_PEW_PEW,
  ES_SEARCH,
} from '../constants';

function isEsSource(layerDescriptor) {
  const sourceType = _.get(layerDescriptor, 'sourceDescriptor.type');
  return [ES_GEO_GRID, ES_PEW_PEW, ES_SEARCH].includes(sourceType);
}

// Migration to move applyGlobalQuery from layer to sources.
// Moving to source to provide user the granularity needed to apply global filter per source.
export function moveApplyGlobalQueryToSources({ attributes }) {
  if (!attributes.layerListJSON) {
    return attributes;
  }

  const layerList = JSON.parse(attributes.layerListJSON);
  layerList.forEach((layerDescriptor) => {

    const applyGlobalQuery = _.get(layerDescriptor, 'applyGlobalQuery', true);
    delete layerDescriptor.applyGlobalQuery;

    if (isEsSource(layerDescriptor)) {
      layerDescriptor.sourceDescriptor.applyGlobalQuery = applyGlobalQuery;
    }

    if (_.has(layerDescriptor, 'joins')) {
      layerDescriptor.joins.forEach(joinDescriptor => {
        if (_.has(joinDescriptor, 'right')) {
          // joinDescriptor.right is ES_TERM_SOURCE source descriptor
          joinDescriptor.right.applyGlobalQuery = applyGlobalQuery;
        }
      });
    }

  });

  return {
    ...attributes,
    layerListJSON: JSON.stringify(layerList),
  };
}
