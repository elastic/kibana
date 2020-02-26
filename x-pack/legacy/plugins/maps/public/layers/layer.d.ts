/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILayerDescriptor } from '../../common/descriptor_types';

export interface ILayer {
  destroy(): void;
}

export class AbstractLayer implements ILayer {
  constructor(descriptor: ILayerDescriptor, source: any);
  destroy(): void;
}
