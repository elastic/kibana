/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiRange } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { GRID_RESOLUTION } from '@kbn/geo-precision';

const RESOLUTIONS = [
  GRID_RESOLUTION.COARSE,
  GRID_RESOLUTION.FINE,
  GRID_RESOLUTION.MOST_FINE,
  GRID_RESOLUTION.SUPER_FINE,
];

const TICKS = [
  {
    label: i18n.translate('xpack.maps.esqlSource.geoPrecisionResolution.lowLabel', {
      defaultMessage: 'low',
    }),
    value: 1,
  },
  { label: <span>&nbsp;</span>, value: 2 },
  { label: <span>&nbsp;</span>, value: 3 },
  {
    label: i18n.translate('xpack.maps.esqlSource.geoPrecisionResolution.highLabel', {
      defaultMessage: 'high',
    }),
    value: 4,
  },
];

interface Props {
  resolution: GRID_RESOLUTION;
  onChange: (resolution: GRID_RESOLUTION) => void;
}

/**
 * Resolution used to calculate the value of the `?_geotile_precision`, `?_geohex_precision` and `?_geohash_precision` ES|QL parameters from the map zoom.
 */
export function GeoPrecisionResolutionEditor({ resolution, onChange }: Props) {
  return (
    <EuiFormRow
      label={i18n.translate('xpack.maps.esqlSource.geoPrecisionResolution.label', {
        defaultMessage: 'Resolution',
      })}
      helpText={i18n.translate('xpack.maps.esqlSource.geoPrecisionResolution.helpText', {
        defaultMessage:
          'Sets the value of the ?_geotile_precision, ?_geohex_precision and ?_geohash_precision parameters from the map zoom level.',
      })}
      display="columnCompressed"
    >
      <EuiRange
        value={RESOLUTIONS.indexOf(resolution) + 1}
        onChange={(event) => {
          onChange(RESOLUTIONS[parseInt(event.currentTarget.value, 10) - 1]);
        }}
        min={1}
        max={RESOLUTIONS.length}
        showTicks
        tickInterval={1}
        ticks={TICKS}
        compressed
        aria-label={i18n.translate('xpack.maps.esqlSource.geoPrecisionResolution.ariaLabel', {
          defaultMessage: 'Resolution',
        })}
      />
    </EuiFormRow>
  );
}
