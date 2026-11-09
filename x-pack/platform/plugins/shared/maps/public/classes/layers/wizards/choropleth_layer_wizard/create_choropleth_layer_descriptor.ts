/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  AGG_TYPE,
  COLOR_MAP_TYPE,
  FIELD_ORIGIN,
  LAYER_TYPE,
  SCALING_TYPES,
  SOURCE_TYPES,
  STYLE_TYPE,
  VECTOR_STYLES,
} from '../../../../../common/constants';
import { getJoinAggKey } from '../../../../../common/get_agg_key';
import type {
  ColorDynamicOptions,
  CountAggDescriptor,
  EMSFileSourceDescriptor,
  ESSearchSourceDescriptor,
  ESTermSourceDescriptor,
  VectorStylePropertiesDescriptor,
} from '../../../../../common/descriptor_types';
import { VectorStyle } from '../../../styles/vector/vector_style';
import { GeoJsonVectorLayer, MvtVectorLayer } from '../../vector_layer';
import { EMSFileSource } from '../../../sources/ems_file_source';
import { ESSearchSource } from '../../../sources/es_search_source';
import { getDefaultDynamicProperties } from '../../../styles/vector/vector_style_defaults';

const defaultDynamicProperties = getDefaultDynamicProperties();

function createChoroplethLayerDescriptor({
  source_descriptor: sourceDescriptor,
  left_field: leftField,
  rightIndexPatternId,
  rightTermField,
  layerType,
}: {
  source_descriptor: EMSFileSourceDescriptor | ESSearchSourceDescriptor;
  left_field: string;
  rightIndexPatternId: string;
  rightTermField: string;
  layerType: LAYER_TYPE.GEOJSON_VECTOR | LAYER_TYPE.MVT_VECTOR;
}) {
  const metricsDescriptor: CountAggDescriptor = { type: AGG_TYPE.COUNT };
  const joinId = uuidv4();
  const joinKey = getJoinAggKey({
    aggType: metricsDescriptor.type,
    aggFieldName: '',
    rightSourceId: joinId,
  });

  const styleProperties: Partial<VectorStylePropertiesDescriptor> = {
    [VECTOR_STYLES.FILL_COLOR]: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        ...(defaultDynamicProperties[VECTOR_STYLES.FILL_COLOR].options as ColorDynamicOptions),
        field: {
          name: joinKey,
          origin: FIELD_ORIGIN.JOIN,
        },
        color: 'Yellow to Red',
        type: COLOR_MAP_TYPE.ORDINAL,
      },
    },
    [VECTOR_STYLES.LINE_COLOR]: {
      type: STYLE_TYPE.STATIC,
      options: {
        color: '#3d3d3d',
      },
    },
  };
  // Styling label by join metric with MVT is not supported
  if (layerType === LAYER_TYPE.GEOJSON_VECTOR) {
    styleProperties[VECTOR_STYLES.LABEL_TEXT] = {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        ...defaultDynamicProperties[VECTOR_STYLES.LABEL_TEXT].options,
        field: {
          name: joinKey,
          origin: FIELD_ORIGIN.JOIN,
        },
      },
    };
  }

  const joins = [
    {
      left_field: leftField,
      right: {
        type: SOURCE_TYPES.ES_TERM_SOURCE,
        id: joinId,
        index_pattern_id: rightIndexPatternId,
        term: rightTermField,
        metrics: [metricsDescriptor],
        apply_global_query: true,
        apply_global_time: true,
        apply_force_refresh: true,
      } as ESTermSourceDescriptor,
    },
  ];

  return layerType === LAYER_TYPE.MVT_VECTOR
    ? MvtVectorLayer.createDescriptor({
        joins,
        source_descriptor: sourceDescriptor,
        style: VectorStyle.createDescriptor(styleProperties),
      })
    : GeoJsonVectorLayer.createDescriptor({
        joins,
        source_descriptor: sourceDescriptor,
        style: VectorStyle.createDescriptor(styleProperties),
      });
}

export function createEmsChoroplethLayerDescriptor({
  leftEmsFileId,
  leftEmsField,
  rightIndexPatternId,
  rightTermField,
}: {
  leftEmsFileId: string;
  leftEmsField: string;
  rightIndexPatternId: string;
  rightTermField: string;
}) {
  return createChoroplethLayerDescriptor({
    source_descriptor: EMSFileSource.createDescriptor({
      id: leftEmsFileId,
      tooltip_properties: [leftEmsField],
    }),
    left_field: leftEmsField,
    rightIndexPatternId,
    rightTermField,
    layerType: LAYER_TYPE.GEOJSON_VECTOR,
  });
}

export function createEsChoroplethLayerDescriptor({
  leftIndexPatternId,
  leftGeoField,
  leftJoinField,
  rightIndexPatternId,
  rightTermField,
}: {
  leftIndexPatternId: string;
  leftGeoField: string;
  leftJoinField: string;
  rightIndexPatternId: string;
  rightTermField: string;
}) {
  return createChoroplethLayerDescriptor({
    source_descriptor: ESSearchSource.createDescriptor({
      index_pattern_id: leftIndexPatternId,
      geo_field: leftGeoField,
      scaling_type: SCALING_TYPES.MVT,
      tooltip_properties: [leftJoinField],
      apply_global_query: false,
      apply_global_time: false,
      apply_force_refresh: false,
    }),
    left_field: leftJoinField,
    rightIndexPatternId,
    rightTermField,
    layerType: LAYER_TYPE.MVT_VECTOR,
  });
}
