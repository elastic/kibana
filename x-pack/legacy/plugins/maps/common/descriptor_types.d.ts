/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid/v4';

export interface ISourceDescriptor {
  id: string;
  type: string;
}

export interface IXYZTMSSourceDescriptor extends ISourceDescriptor {
  urlTemplate: string;
}

export interface IESAggSourceDescriptor extends ISourceDescriptor {
  indexPatternId: string;
  metrics: unknown[];
}

export interface IGeoGridSourceDescriptor extends IESAggSourceDescriptor {
  geoField: string;
  requestType: string;
  resolution: string;
}

export interface ILayerDescriptor {
  sourceDescriptor: ISourceDescriptor;
  id: string;
  label?: string;
}

interface IFieldMetaDescriptor {
  [key: string]: string | number | unknown;
}

interface IRangeFieldMetaDescriptor extends IFieldMetaDescriptor {
  min: number;
  max: number;
  delta: number;
}

interface ICategoryFieldMetaDescriptor extends IFieldMetaDescriptor {
  categories: unknown[];
}

interface IGeometryTypesDescriptor {
  isPointsOnly: boolean;
  isLinesOnly: boolean;
  isPolygonsOnly: boolean;
}
interface IStyleMetaDescriptor {
  geometryTypes?: IGeometryTypesDescriptor;
  [key: string]: IRangeFieldMetaDescriptor | ICategoryFieldMetaDescriptor | unknown;
}
