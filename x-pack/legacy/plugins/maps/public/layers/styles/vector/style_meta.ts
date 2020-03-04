/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  StyleMetaDescriptor,
  GeometryTypesDescriptor,
  RangeFieldMetaDescriptor,
  CategoryFieldMetaDescriptor,
} from '../../../../common/descriptor_types';

export class StyleMeta {
  private readonly _descriptor: StyleMetaDescriptor;
  constructor(styleMetaDescriptor: StyleMetaDescriptor) {
    this._descriptor = styleMetaDescriptor;
  }

  _getGeometryTypes(): GeometryTypesDescriptor {
    return this._descriptor.geometryTypes
      ? this._descriptor.geometryTypes
      : {
          isPointsOnly: false,
          isLinesOnly: false,
          isPolygonsOnly: false,
        };
  }

  // (field: string): FieldMetaDescriptor | unknown {
  //   return this._descriptor ? this._descriptor.fieldMeta[field] : null;
  // }

  getRangeFieldMetaDescriptor(fieldName: string): RangeFieldMetaDescriptor | null {
    return this._descriptor && this._descriptor.fieldMeta[fieldName]
      ? this._descriptor.fieldMeta[fieldName].RANGE
      : null;
  }

  getCategoryFieldMetaDescriptor(fieldName: string): CategoryFieldMetaDescriptor | null {
    return this._descriptor ? this._descriptor.fieldMeta[fieldName].CATEGORIES : null;
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
