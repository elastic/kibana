/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { emsWorldLayerId } from '../../../../../../common/constants';
import { getDefaultStaticProperties } from '../../../../styles/vector/vector_style_defaults';

jest.mock('../../../../../kibana_services', () => {
  return {
    getIsDarkMode() {
      return false;
    },
    getEMSSettings() {
      return {
        isEMSUrlSet() {
          return false;
        },
      };
    },
    getSpaceId() {
      return 'default';
    },
  };
});

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('12345'),
}));

import { createLayerDescriptor } from './create_layer_descriptor';
import { OBSERVABILITY_LAYER_TYPE } from './layer_select';
import { OBSERVABILITY_METRIC_TYPE } from './metric_select';
import { DISPLAY } from './display_select';

describe('createLayerDescriptor', () => {
  test('Should create vector layer descriptor with join when displayed as choropleth', () => {
    const layerDescriptor = createLayerDescriptor({
      layer: OBSERVABILITY_LAYER_TYPE.APM_RUM_PERFORMANCE,
      metric: OBSERVABILITY_METRIC_TYPE.TRANSACTION_DURATION,
      display: DISPLAY.CHOROPLETH,
    });

    expect(layerDescriptor).toEqual({
      __dataRequests: [],
      alpha: 0.75,
      id: '12345',
      include_in_fit_to_bounds: true,
      joins: [
        {
          left_field: 'iso2',
          right: {
            apply_global_query: true,
            apply_global_time: true,
            id: '12345',
            index_pattern_id: 'apm_static_data_view_id_default',
            metrics: [
              {
                field: 'transaction.duration.us',
                type: 'avg',
              },
            ],
            apply_force_refresh: true,
            term: 'client.geo.country_iso_code',
            type: 'ES_TERM_SOURCE',
            where_query: {
              language: 'kuery',
              query: 'processor.event:"transaction"',
            },
          },
        },
      ],
      label: '[Performance] Duration',
      max_zoom: 24,
      min_zoom: 0,
      disable_tooltips: false,
      source_descriptor: {
        id: emsWorldLayerId,
        tooltip_properties: ['name', 'iso2'],
        type: 'EMS_FILE',
      },
      style: {
        is_time_aware: true,
        properties: {
          ...getDefaultStaticProperties(),
          fillColor: {
            options: {
              color: 'Green to Red',
              color_category: 'palette_0',
              field: {
                name: '__kbnjoin__avg_of_transaction.duration.us__12345',
                origin: 'join',
              },
              field_meta_options: {
                is_enabled: true,
                sigma: 3,
              },
              type: 'ORDINAL',
            },
            type: 'DYNAMIC',
          },
          lineColor: {
            options: {
              color: '#3d3d3d',
            },
            type: 'STATIC',
          },
        },
        type: 'VECTOR',
      },
      type: 'GEOJSON_VECTOR',
      visible: true,
    });
  });

  test('Should create heatmap layer descriptor when displayed as heatmap', () => {
    const layerDescriptor = createLayerDescriptor({
      layer: OBSERVABILITY_LAYER_TYPE.APM_RUM_PERFORMANCE,
      metric: OBSERVABILITY_METRIC_TYPE.TRANSACTION_DURATION,
      display: DISPLAY.HEATMAP,
    });
    expect(layerDescriptor).toEqual({
      __dataRequests: [],
      alpha: 0.75,
      id: '12345',
      include_in_fit_to_bounds: true,
      label: '[Performance] Duration',
      max_zoom: 24,
      min_zoom: 0,
      query: {
        language: 'kuery',
        query: 'processor.event:"transaction"',
      },
      source_descriptor: {
        apply_global_query: true,
        apply_global_time: true,
        geo_field: 'client.geo.location',
        id: '12345',
        index_pattern_id: 'apm_static_data_view_id_default',
        metrics: [
          {
            field: 'transaction.duration.us',
            type: 'avg',
          },
        ],
        request_type: 'heatmap',
        resolution: 'MOST_FINE',
        apply_force_refresh: true,
        type: 'ES_GEO_GRID',
      },
      style: {
        color_ramp_name: 'theclassic',
        type: 'HEATMAP',
      },
      type: 'HEATMAP',
      visible: true,
    });
  });

  test('Should create vector layer descriptor when displayed as clusters', () => {
    const layerDescriptor = createLayerDescriptor({
      layer: OBSERVABILITY_LAYER_TYPE.APM_RUM_PERFORMANCE,
      metric: OBSERVABILITY_METRIC_TYPE.TRANSACTION_DURATION,
      display: DISPLAY.CLUSTERS,
    });
    expect(layerDescriptor).toEqual({
      __dataRequests: [],
      alpha: 0.75,
      id: '12345',
      include_in_fit_to_bounds: true,
      joins: [],
      label: '[Performance] Duration',
      max_zoom: 24,
      min_zoom: 0,
      disable_tooltips: false,
      query: {
        language: 'kuery',
        query: 'processor.event:"transaction"',
      },
      source_descriptor: {
        apply_global_query: true,
        apply_global_time: true,
        geo_field: 'client.geo.location',
        id: '12345',
        index_pattern_id: 'apm_static_data_view_id_default',
        metrics: [
          {
            field: 'transaction.duration.us',
            type: 'avg',
          },
        ],
        request_type: 'point',
        resolution: 'MOST_FINE',
        apply_force_refresh: true,
        type: 'ES_GEO_GRID',
      },
      style: {
        is_time_aware: true,
        properties: {
          ...getDefaultStaticProperties(),
          fillColor: {
            options: {
              color: 'Green to Red',
              color_category: 'palette_0',
              field: {
                name: 'avg_of_transaction.duration.us',
                origin: 'source',
              },
              field_meta_options: {
                is_enabled: true,
                sigma: 3,
              },
              type: 'ORDINAL',
            },
            type: 'DYNAMIC',
          },
          iconSize: {
            options: {
              field: {
                name: 'avg_of_transaction.duration.us',
                origin: 'source',
              },
              field_meta_options: {
                is_enabled: true,
                sigma: 3,
              },
              max_size: 32,
              min_size: 7,
            },
            type: 'DYNAMIC',
          },
          lineColor: {
            options: {
              color: '#3d3d3d',
            },
            type: 'STATIC',
          },
        },
        type: 'VECTOR',
      },
      type: 'GEOJSON_VECTOR',
      visible: true,
    });
  });
});
