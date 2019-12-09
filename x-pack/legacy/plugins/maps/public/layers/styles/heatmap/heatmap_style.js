/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { GRID_RESOLUTION } from '../../grid_resolution';
import { AbstractStyle } from '../abstract_style';
import { HeatmapStyleEditor } from './components/heatmap_style_editor';
import { HeatmapLegend } from './components/legend/heatmap_legend';
import { DEFAULT_HEATMAP_COLOR_RAMP_NAME } from './components/heatmap_constants';
import { LAYER_STYLE_TYPE } from '../../../../common/constants';
import { getColorRampStops } from '../color_utils';
import { i18n } from '@kbn/i18n';
import { EuiIcon } from '@elastic/eui';

export class HeatmapStyle extends AbstractStyle {

  static type = LAYER_STYLE_TYPE.HEATMAP;

  constructor(descriptor = {}) {
    super();
    this._descriptor = HeatmapStyle.createDescriptor(descriptor.colorRampName);
  }

  static createDescriptor(colorRampName) {
    return {
      type: HeatmapStyle.type,
      colorRampName: colorRampName ? colorRampName : DEFAULT_HEATMAP_COLOR_RAMP_NAME,
    };
  }

  static getDisplayName() {
    return i18n.translate('xpack.maps.style.heatmap.displayNameLabel', {
      defaultMessage: 'Heatmap style'
    });
  }

  renderEditor({ onStyleDescriptorChange }) {
    const onHeatmapColorChange = ({ colorRampName }) => {
      const styleDescriptor = HeatmapStyle.createDescriptor(colorRampName);
      onStyleDescriptorChange(styleDescriptor);
    };

    return (
      <HeatmapStyleEditor
        colorRampName={this._descriptor.colorRampName}
        onHeatmapColorChange={onHeatmapColorChange}
      />
    );
  }

  renderLegendDetails(field) {
    return (
      <HeatmapLegend
        colorRampName={this._descriptor.colorRampName}
        field={field}
      />
    );
  }

  getIcon() {
    return (
      <EuiIcon
        size="m"
        type="heatmap"
      />
    );
  }

  setMBPaintProperties({ mbMap, layerId, propertyName, resolution }) {
    let radius;
    if (resolution === GRID_RESOLUTION.COARSE) {
      radius = 128;
    } else if (resolution === GRID_RESOLUTION.FINE) {
      radius = 64;
    } else if (resolution === GRID_RESOLUTION.MOST_FINE) {
      radius = 32;
    } else {
      const errorMessage = i18n.translate('xpack.maps.style.heatmap.resolutionStyleErrorMessage', {
        defaultMessage: `Resolution param not recognized: {resolution}`,
        values: { resolution }
      });
      throw new Error(errorMessage);
    }
    mbMap.setPaintProperty(layerId, 'heatmap-radius', radius);
    mbMap.setPaintProperty(layerId, 'heatmap-weight', {
      type: 'identity',
      property: propertyName
    });

    const { colorRampName } = this._descriptor;
    if (colorRampName && colorRampName !== DEFAULT_HEATMAP_COLOR_RAMP_NAME) {
      const colorStops = getColorRampStops(colorRampName);
      mbMap.setPaintProperty(layerId, 'heatmap-color', [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0, 'rgba(0, 0, 255, 0)',
        ...colorStops.slice(2) // remove first stop from colorStops to avoid conflict with transparent stop at zero
      ]);
    } else {
      mbMap.setPaintProperty(layerId, 'heatmap-color', [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0, 'rgba(0, 0, 255, 0)',
        0.1, 'royalblue',
        0.3, 'cyan',
        0.5, 'lime',
        0.7, 'yellow',
        1, 'red'
      ]);
    }
  }
}
