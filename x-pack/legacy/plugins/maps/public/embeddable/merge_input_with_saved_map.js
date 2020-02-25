/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { DEFAULT_IS_LAYER_TOC_OPEN } from '../reducers/ui';

const MAP_EMBEDDABLE_INPUT_KEYS = [
  'hideFilterActions',
  'isLayerTOCOpen',
  'openTOCDetails',
  'mapCenter',
];

export function mergeInputWithSavedMap(input, savedMap) {
  const mergedInput = _.pick(input, MAP_EMBEDDABLE_INPUT_KEYS);

  if (!_.has(input, 'isLayerTOCOpen') && savedMap.uiStateJSON) {
    const uiState = JSON.parse(savedMap.uiStateJSON);
    mergedInput.isLayerTOCOpen = _.get(uiState, 'isLayerTOCOpen', DEFAULT_IS_LAYER_TOC_OPEN);
  }

  if (!_.has(input, 'openTOCDetails') && savedMap.uiStateJSON) {
    const uiState = JSON.parse(savedMap.uiStateJSON);
    if (_.has(uiState, 'openTOCDetails')) {
      mergedInput.openTOCDetails = _.get(uiState, 'openTOCDetails', []);
    }
  }

  if (!input.mapCenter && savedMap.mapStateJSON) {
    const mapState = JSON.parse(savedMap.mapStateJSON);
    mergedInput.mapCenter = {
      lat: mapState.center.lat,
      lon: mapState.center.lon,
      zoom: mapState.zoom,
    };
  }

  return mergedInput;
}
