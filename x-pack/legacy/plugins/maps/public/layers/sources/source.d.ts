/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractSourceDescriptor } from '../../../common/descriptor_types';
import { ILayer } from '../layer';

export interface ISource {
  createDefaultLayer(): ILayer;
  getDisplayName(): Promise<string>;
}

export class AbstractSource implements ISource {
  constructor(sourceDescriptor: AbstractSourceDescriptor, inspectorAdapters: object);
  createDefaultLayer(): ILayer;
  getDisplayName(): Promise<string>;
}
