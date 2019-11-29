/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { FEATURE_ID_PROPERTY_NAME } from '../../../common/constants';

let idCounter = 0;

function generateNumericalId() {
  const newId = idCounter < Number.MAX_SAFE_INTEGER ? idCounter : 0;
  idCounter = newId + 1;
  return newId;
}

export function assignFeatureIds(featureCollection) {

  // wrt https://github.com/elastic/kibana/issues/39317
  // In constrained resource environments, mapbox-gl may throw a stackoverflow error due to hitting the browser's recursion limit. This crashes Kibana.
  // This error is thrown in mapbox-gl's quicksort implementation, when it is sorting all the features by id.
  // This is a work-around to avoid hitting such a worst-case
  // This was tested as a suitable work-around for mapbox-gl 0.54
  // The core issue itself is likely related to https://github.com/mapbox/mapbox-gl-js/issues/6086

  // This only shuffles the id-assignment, _not_ the features in the collection
  // The reason for this is that we do not want to modify the feature-ordering, which is the responsiblity of the VectorSource#.
  const ids = [];
  for (let i = 0; i < featureCollection.features.length; i++) {
    const id = generateNumericalId();
    ids.push(id);
  }

  const randomizedIds = _.shuffle(ids);
  const features = [];
  for (let i = 0; i < featureCollection.features.length; i++) {
    const numericId = randomizedIds[i];
    const feature = featureCollection.features[i];
    features.push({
      type: 'Feature',
      geometry: feature.geometry,  // do not copy geometry, this object can be massive
      properties: {
        // preserve feature id provided by source so features can be referenced across fetches
        [FEATURE_ID_PROPERTY_NAME]: feature.id == null ? numericId : feature.id,
        // create new object for properties so original is not polluted with kibana internal props
        ...feature.properties,
      },
      id: numericId, // Mapbox feature state id, must be integer
    });
  }

  return {
    type: 'FeatureCollection',
    features
  };
}
