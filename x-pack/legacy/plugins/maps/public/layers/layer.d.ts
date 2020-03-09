/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { LayerDescriptor } from '../../common/descriptor_types';
import { ISource } from './sources/source';

export interface ILayer {
  getDisplayName(): Promise<string>;
}

export interface ILayerArguments {
  layerDescriptor: LayerDescriptor;
  source: ISource;
}

export class AbstractLayer implements ILayer {
  constructor(layerArguments: ILayerArguments);
  getDisplayName(): Promise<string>;
}
