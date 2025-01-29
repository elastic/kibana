/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Map as MbMap } from '@kbn/mapbox-gl';
import { AbstractStyleProperty } from './style_property';
import { LabelZoomRangeStylePropertyDescriptor } from '../../../../../common/descriptor_types';
import { VECTOR_STYLES } from '../../../../../common/constants';

export class LabelZoomRangeProperty extends AbstractStyleProperty<
  LabelZoomRangeStylePropertyDescriptor['options']
> {
  private readonly _layerMinZoom: number;
  private readonly _layerMaxZoom: number;

  constructor(
    options: LabelZoomRangeStylePropertyDescriptor['options'],
    styleName: VECTOR_STYLES,
    layerMinZoom: number,
    layerMaxZoom: number
  ) {
    super(options, styleName);
    this._layerMinZoom = layerMinZoom;
    this._layerMaxZoom = layerMaxZoom;
  }

  syncLabelZoomRange(mbLayerId: string, mbMap: MbMap) {
    const { maxZoom, minZoom } = this.getLabelZoomRange();
    mbMap.setLayerZoomRange(mbLayerId, minZoom, maxZoom);
  }

  getLayerZoomRange() {
    return {
      maxZoom: this._layerMaxZoom,
      minZoom: this._layerMinZoom,
    };
  }

  getLabelZoomRange() {
    const { useLayerZoomRange, maxZoom, minZoom } = this.getOptions();
    return useLayerZoomRange
      ? this.getLayerZoomRange()
      : {
          maxZoom: Math.min(this._layerMaxZoom, maxZoom),
          minZoom: Math.max(this._layerMinZoom, minZoom),
        };
  }
}
