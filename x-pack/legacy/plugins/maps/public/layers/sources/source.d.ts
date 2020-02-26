/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ISourceDescriptor } from '../../../common/descriptor_types';
import { ILayer } from '../layer';

export interface ISource {
  destroy(): void;

  cloneDescriptor(): ISourceDescriptor;

  supportsFitToBounds(): Promise<boolean>;

  getImmutableProperties(): Promise<unknown[]>;

  getInspectorAdapters(): unknown;

  createDefaultLayer(): ILayer;

  getDisplayName(): string;
}

export class AbstractSource implements ISource {
  constructor(sourceDescriptor: ISourceDescriptor, inspectorAdapters: object);

  cloneDescriptor(): ISourceDescriptor;

  createDefaultLayer(): ILayer;

  destroy(): void;

  getDisplayName(): string;

  getImmutableProperties(): Promise<unknown[]>;

  getInspectorAdapters(): unknown;

  supportsFitToBounds(): Promise<boolean>;
}
