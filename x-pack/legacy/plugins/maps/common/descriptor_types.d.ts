/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type EMSXYZSourceType = 'EMS_XYZ';
export type SourceType = EMSXYZSourceType | string;

export interface ISourceDescriptor {
  id: string;
  type: SourceType;
}

export interface IXYZTMSSourceDescriptor extends ISourceDescriptor {
  urlTemplate: string;
  type: EMSXYZSourceType;
}

export interface ILayerDescriptor {
  sourceDescriptor: ISourceDescriptor;
  id: string;
}
