/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  AGG_TYPE,
  FIELD_ORIGIN,
  SCALING_TYPES,
  SOURCE_TYPES,
  STYLE_TYPE,
  VECTOR_STYLES,
} from '../../../../../../common/constants';
import { getJoinAggKey } from '../../../../../../common/get_agg_key';
import type {
  CountAggDescriptor,
  ESDistanceSourceDescriptor,
  VectorStylePropertiesDescriptor,
} from '../../../../../../common/descriptor_types';
import { VectorStyle } from '../../../../styles/vector/vector_style';
import { GeoJsonVectorLayer } from '../../../vector_layer';
// @ts-ignore
import { ESSearchSource } from '../../../../sources/es_search_source';
import { getDefaultDynamicProperties } from '../../../../styles/vector/vector_style_defaults';

const defaultDynamicProperties = getDefaultDynamicProperties();

export function createDistanceJoinLayerDescriptor({
  distance,
  leftDataViewId,
  leftGeoField,
  rightDataViewId,
  rightGeoField,
}: {
  distance: number;
  leftDataViewId: string;
  leftGeoField: string;
  rightDataViewId: string;
  rightGeoField: string;
}) {
  const metricsDescriptor: CountAggDescriptor = { type: AGG_TYPE.COUNT };
  const joinId = uuidv4();
  const countJoinFieldName = getJoinAggKey({
    aggType: metricsDescriptor.type,
    rightSourceId: joinId,
  });

  const styleProperties: Partial<VectorStylePropertiesDescriptor> = {
    [VECTOR_STYLES.LABEL_TEXT]: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        ...defaultDynamicProperties[VECTOR_STYLES.LABEL_TEXT].options,
        field: {
          name: countJoinFieldName,
          origin: FIELD_ORIGIN.JOIN,
        },
      },
    },
  };

  const joins = [
    {
      left_field: '_id',
      right: {
        type: SOURCE_TYPES.ES_DISTANCE_SOURCE,
        id: joinId,
        index_pattern_id: rightDataViewId,
        metrics: [metricsDescriptor],
        distance,
        geo_field: rightGeoField,
        apply_global_query: true,
        apply_global_time: true,
        apply_force_refresh: true,
      } as ESDistanceSourceDescriptor,
    },
  ];

  return GeoJsonVectorLayer.createDescriptor({
    joins,
    source_descriptor: ESSearchSource.createDescriptor({
      index_pattern_id: leftDataViewId,
      geo_field: leftGeoField,
      scaling_type: SCALING_TYPES.LIMIT,
      apply_global_query: true,
      apply_global_time: true,
      apply_force_refresh: true,
    }),
    style: VectorStyle.createDescriptor(styleProperties),
  });
}
