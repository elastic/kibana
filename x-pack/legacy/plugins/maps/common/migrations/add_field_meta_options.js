/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import {  LAYER_TYPE, STYLE_TYPE } from '../constants';

function isVectorLayer(layerDescriptor) {
  const layerType = _.get(layerDescriptor, 'type');
  return layerType === LAYER_TYPE.VECTOR;
}

export function addFieldMetaOptions({ attributes }) {
  if (!attributes.layerListJSON) {
    return attributes;
  }

  const layerList = JSON.parse(attributes.layerListJSON);
  layerList.forEach((layerDescriptor) => {
    if (isVectorLayer(layerDescriptor) && _.has(layerDescriptor, 'style.properties')) {
      Object.values(layerDescriptor.style.properties).forEach(stylePropertyDescriptor => {
        if (stylePropertyDescriptor.type === STYLE_TYPE.DYNAMIC) {
          stylePropertyDescriptor.options.fieldMetaOptions = {
            isEnabled: false, // turn off field metadata to avoid changing behavior of existing saved objects
            sigma: 3,
          };
        }
      });
    }
  });

  return {
    ...attributes,
    layerListJSON: JSON.stringify(layerList),
  };
}
