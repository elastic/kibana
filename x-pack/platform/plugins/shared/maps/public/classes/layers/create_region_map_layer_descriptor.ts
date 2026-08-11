/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Writable } from '@kbn/utility-types';
import type {
  AggDescriptor,
  ColorDynamicOptions,
  ESTermSourceDescriptor,
  LayerDescriptor,
} from '../../../common/descriptor_types';
import {
  createLegacyJoinMetricStyleField,
  createLegacyRegionMapAggDescriptor,
  createLegacyRegionMapVectorStyleProperties,
  createLegacyTermSourceDescriptor,
} from '../../../common/legacy_maps_conversion';
import { VECTOR_STYLES } from '../../../common/constants';
import { VectorStyle } from '../styles/vector/vector_style';
import { createEmsFileSourceDescriptor } from '../../../common/descriptor_factories';
import { GeoJsonVectorLayer } from './vector_layer';
import { getDefaultDynamicProperties } from '../styles/vector/vector_style_defaults';
import { NUMERICAL_COLOR_PALETTES } from '../styles/color_palettes';
import { getJoinAggKey } from '../../../common/get_agg_key';

const defaultDynamicProperties = getDefaultDynamicProperties();

export interface CreateRegionMapLayerDescriptorParams {
  label: string;
  emsLayerId?: string;
  leftFieldName?: string;
  termsFieldName?: string;
  termsSize?: number;
  colorSchema: string;
  indexPatternId?: string;
  metricAgg: string;
  metricFieldName?: string;
}

export function createAggDescriptor(metricAgg: string, metricFieldName?: string): AggDescriptor {
  return createLegacyRegionMapAggDescriptor(metricAgg, metricFieldName);
}

export function createRegionMapLayerDescriptor({
  label,
  emsLayerId,
  leftFieldName,
  termsFieldName,
  termsSize,
  colorSchema,
  indexPatternId,
  metricAgg,
  metricFieldName,
}: CreateRegionMapLayerDescriptorParams): LayerDescriptor | null {
  if (!indexPatternId || !emsLayerId || !leftFieldName || !termsFieldName) {
    return null;
  }

  const metricsDescriptor = createAggDescriptor(metricAgg, metricFieldName);
  const joinId = uuidv4();
  const joinKey = getJoinAggKey({
    aggType: metricsDescriptor.type,
    aggFieldName: 'field' in metricsDescriptor ? metricsDescriptor.field : '',
    rightSourceId: joinId,
  });
  const colorPallette = NUMERICAL_COLOR_PALETTES.find((pallette) => {
    return pallette.value.toLowerCase() === colorSchema.toLowerCase();
  });
  const termSourceDescriptor: Writable<ESTermSourceDescriptor> = createLegacyTermSourceDescriptor({
    id: joinId,
    indexPatternId,
    term: termsFieldName,
    metrics: [metricsDescriptor],
    size: termsSize,
  });
  return GeoJsonVectorLayer.createDescriptor({
    label,
    joins: [
      {
        leftField: leftFieldName,
        right: termSourceDescriptor,
      },
    ],
    sourceDescriptor: createEmsFileSourceDescriptor({
      id: emsLayerId,
      tooltipProperties: ['name', leftFieldName],
    }),
    style: VectorStyle.createDescriptor({
      ...createLegacyRegionMapVectorStyleProperties({
        joinStyleField: createLegacyJoinMetricStyleField(joinKey),
        color: colorPallette ? colorPallette.value : 'Yellow to Red',
        defaults: {
          fillColor: defaultDynamicProperties[VECTOR_STYLES.FILL_COLOR]
            .options as ColorDynamicOptions,
        },
      }),
    }),
  });
}
