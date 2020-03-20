/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractLayer, ILayerArguments } from './layer';
import { ITMSSource } from './sources/tms_source';
import { LayerDescriptor } from '../../common/descriptor_types';

interface ITileLayerArguments extends ILayerArguments {
  source: ITMSSource;
  layerDescriptor: LayerDescriptor;
}

export class TileLayer extends AbstractLayer {
  constructor(args: ITileLayerArguments);
}
