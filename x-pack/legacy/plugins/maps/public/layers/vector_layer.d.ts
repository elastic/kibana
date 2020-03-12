/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { AbstractLayer } from './layer';
import { IVectorSource } from './sources/vector_source';
import { VectorLayerDescriptor } from '../../common/descriptor_types';
import { ILayer } from './layer';
import { IJoin } from './joins/join';

type VectorLayerArguments = {
  source: IVectorSource;
  layerDescriptor: VectorLayerDescriptor;
};

export interface IVectorLayer extends ILayer {
  getValidJoins(): IJoin[];
}

export class VectorLayer extends AbstractLayer implements IVectorLayer {
  constructor(options: VectorLayerArguments);

  getValidJoins(): IJoin[];
  _getSearchFilters(dataFilters: unknown): unknown;
}
