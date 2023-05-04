/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { EuiCallOut, EuiPanel, htmlIdGenerator } from '@elastic/eui';
import { RenderWizardArguments } from '@kbn/maps-plugin/public';
import { LayerDescriptor, LAYER_TYPE } from '@kbn/maps-plugin/common';
import { CustomRasterSource } from './custom_raster_source';

export class CustomRasterEditor extends Component<RenderWizardArguments> {
  componentDidMount() {
    const customRasterLayerDescriptor: LayerDescriptor = {
      id: htmlIdGenerator()(),
      type: LAYER_TYPE.RASTER_TILE,
      sourceDescriptor: CustomRasterSource.createDescriptor(),
      style: {
        type: 'RASTER',
      },
      alpha: 1,
    };
    this.props.previewLayers([customRasterLayerDescriptor]);
  }

  render() {
    return (
      <EuiPanel>
        <EuiCallOut title="NOAA Weather">
          <p>
            Displays NOAA weather data. Kibana time is passed to request so weather data is
            displayed for selected time range.
          </p>
        </EuiCallOut>
      </EuiPanel>
    );
  }
}
