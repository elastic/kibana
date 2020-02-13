/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { VectorLayer } from './vector_layer';
import { LAYER_TYPE } from '../../common/constants';

export class BlendedVectorLayer extends VectorLayer {
  static type = LAYER_TYPE.BLENDED_VECTOR;

  static createDescriptor(options, mapColors) {
    const layerDescriptor = VectorLayer.createDescriptor(options, mapColors);
    layerDescriptor.type = BlendedVectorLayer.type;
    return layerDescriptor;
  }

  /*syncLayerWithMB(mbMap) {}*/
}
