/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { LayerControl } from './layer_control';
import { MouseCoordinatesControl } from './mouse_coordinates_control';
import { AttributionControl } from './attribution_control';
import type { MapSettings } from '../../../common/descriptor_types';

export interface Props {
  settings: MapSettings;
  isInteractive?: boolean;
}

export function RightSideControls({ settings, isInteractive }: Props) {
  return (
    <EuiFlexGroup
      className="mapWidgetOverlay"
      responsive={false}
      direction="column"
      alignItems="flexEnd"
      gutterSize="s"
    >
      <EuiFlexItem className="mapWidgetOverlay__layerWrapper">
        {isInteractive && !settings.hideLayerControl && <LayerControl />}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {isInteractive && !settings.hideViewControl && <MouseCoordinatesControl />}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <AttributionControl />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
