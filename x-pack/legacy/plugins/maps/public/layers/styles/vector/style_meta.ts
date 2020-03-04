/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  StyleMetaValues,
  GeometryTypes,
  RangeFieldMeta,
  CategoryFieldMeta,
} from '../../../../common/descriptor_types';

export class StyleMeta {
  private readonly _descriptor: StyleMetaValues;
  constructor(styleMetaDescriptor: StyleMetaValues) {
    this._descriptor = styleMetaDescriptor;
  }

  _getGeometryTypes(): GeometryTypes {
    return this._descriptor.geometryTypes
      ? this._descriptor.geometryTypes
      : {
          isPointsOnly: false,
          isLinesOnly: false,
          isPolygonsOnly: false,
        };
  }

  getRangeFieldMetaDescriptor(fieldName: string): RangeFieldMeta | null {
    return this._descriptor && this._descriptor.fieldMeta[fieldName]
      ? this._descriptor.fieldMeta[fieldName].RANGE
      : null;
  }

  getCategoryFieldMetaDescriptor(fieldName: string): CategoryFieldMeta | null {
    return this._descriptor && this._descriptor.fieldMeta[fieldName]
      ? this._descriptor.fieldMeta[fieldName].CATEGORIES
      : null;
  }

  isPointsOnly(): boolean {
    return this._getGeometryTypes().isPointsOnly;
  }

  isLinesOnly(): boolean {
    return this._getGeometryTypes().isLinesOnly;
  }

  isPolygonsOnly(): boolean {
    return this._getGeometryTypes().isPolygonsOnly;
  }
}
