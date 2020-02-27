/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  IFieldMetaDescriptor,
  IStyleMetaDescriptor,
  IGeometryTypesDescriptor,
} from '../../../../common/descriptor_types';

export class StyleMeta {
  private _descriptor: IStyleMetaDescriptor;
  constructor(styleMetaDescriptor: IStyleMetaDescriptor) {
    this._descriptor = styleMetaDescriptor;
  }

  _getGeometryTypes(): IGeometryTypesDescriptor {
    return this._descriptor.geometryTypes
      ? this._descriptor.geometryTypes
      : {
          isPointsOnly: false,
          isLinesOnly: false,
          isPolygonsOnly: false,
        };
  }

  getFieldMetaDescriptor(field: string): IFieldMetaDescriptor | unknown {
    return this._descriptor ? this._descriptor.fieldMeta[field] : null;
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
