/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractSourceDescriptor } from '../../../common/descriptor_types';
import { ILayer } from '../layer';

export interface ISource {
  createDefaultLayer(): ILayer;
  destroy(): void;
  getDisplayName(): Promise<string>;
  getInspectorAdapters(): object;
  isFieldAware(): boolean;
  isFilterByMapBounds(): boolean;
  isGeoGridPrecisionAware(): boolean;
  isQueryAware(): boolean;
  isRefreshTimerAware(): Promise<boolean>;
  isTimeAware(): Promise<boolean>;
}

export class AbstractSource implements ISource {
  constructor(sourceDescriptor: AbstractSourceDescriptor, inspectorAdapters: object);

  destroy(): void;
  createDefaultLayer(): ILayer;
  getDisplayName(): Promise<string>;
  getInspectorAdapters(): object;
  isFieldAware(): boolean;
  isFilterByMapBounds(): boolean;
  isGeoGridPrecisionAware(): boolean;
  isQueryAware(): boolean;
  isRefreshTimerAware(): Promise<boolean>;
  isTimeAware(): Promise<boolean>;
}
