/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { IStyle } from '../style';
import { EMSVectorTileStyleDescriptor, StyleDescriptor } from '../../../../common/descriptor_types';
import { LAYER_STYLE_TYPE } from '../../../../common/constants';
import { EMSVectorTileStyleEditor } from './components/ems_vector_tile_style_editor';

export class EMSVectorTileStyle implements IStyle {
  readonly _descriptor: EMSVectorTileStyleDescriptor;

  constructor(descriptor: { color: string } = { color: '' }) {
    this._descriptor = EMSVectorTileStyle.createDescriptor(descriptor.color);
  }

  static createDescriptor(color?: string) {
    return {
      type: LAYER_STYLE_TYPE.EMS_VECTOR_TILE,
      color: color ?? '',
    };
  }

  getType() {
    return LAYER_STYLE_TYPE.EMS_VECTOR_TILE;
  }

  getColor() {
    return this._descriptor.color;
  }

  renderEditor(onStyleDescriptorChange: (styleDescriptor: StyleDescriptor) => void) {
    const onColorChange = ({ color }: { color: string }) => {
      const styleDescriptor = EMSVectorTileStyle.createDescriptor(color);
      onStyleDescriptorChange(styleDescriptor);
    };

    return (
      <EMSVectorTileStyleEditor color={this._descriptor.color} onColorChange={onColorChange} />
    );
  }
}
