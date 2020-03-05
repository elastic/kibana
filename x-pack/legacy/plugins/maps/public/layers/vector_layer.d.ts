/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { AbstractLayer } from './layer';
import { IVectorSource } from './sources/vector_source';
import { VectorLayerDescriptor } from '../../common/descriptor_types';

type VectorLayerArguments = {
  source: IVectorSource;
  layerDescriptor: VectorLayerDescriptor;
};

export class VectorLayer extends AbstractLayer {
  constructor(options: VectorLayerArguments);
}
