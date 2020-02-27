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

  getGeometryTypes(): IGeometryTypesDescriptor {
    return this._descriptor.geometryTypes
      ? this._descriptor.geometryTypes
      : {
          isPointsOnly: false,
          isLinesOnly: false,
          isPolygonsOnly: false,
        };
  }

  getFieldMetaDescriptor(field: string): IFieldMetaDescriptor | unknown {
    if (field === 'geometryTypes') {
      throw new Error('Cannot use geometryTypes as field-key');
    }
    return this._descriptor[field];
  }

  isPointsOnly(): boolean {
    return this.getGeometryTypes().isPointsOnly;
  }

  isLinesOnly(): boolean {
    return this.getGeometryTypes().isLinesOnly;
  }

  isPolygonsOnly(): boolean {
    return this.getGeometryTypes().isPolygonsOnly;
  }
}
