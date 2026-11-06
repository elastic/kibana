/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

import { createSecurityLayerDescriptors } from './create_layer_descriptors';

describe('createLayerDescriptor', () => {
  test('apm index', () => {
    expect(
      createSecurityLayerDescriptors('apm_static_data_view_id_default', 'apm-*-transaction*')
    ).toEqual([
      {
        __dataRequests: [],
        alpha: 0.75,
        id: '12345',
        include_in_fit_to_bounds: true,
        joins: [],
        label: 'apm-*-transaction* | Source Point',
        max_zoom: 24,
        min_zoom: 0,
        parent: '12345',
        disable_tooltips: false,
        source_descriptor: {
          apply_global_query: true,
          apply_global_time: true,
          filter_by_map_bounds: true,
          geo_field: 'client.geo.location',
          id: '12345',
          index_pattern_id: 'apm_static_data_view_id_default',
          apply_force_refresh: true,
          scaling_type: 'TOP_HITS',
          sort_field: '',
          sort_order: 'desc',
          tooltip_properties: [
            'host.name',
            'client.ip',
            'client.domain',
            'client.geo.country_iso_code',
            'client.as.organization.name',
          ],
          top_hits_group_by_timeseries: false,
          top_hits_size: 1,
          top_hits_split_field: 'client.ip',
          type: 'ES_SEARCH',
        },
        style: {
          is_time_aware: true,
          properties: {
            ...getDefaultStaticProperties(),
            fillColor: {
              options: {
                color: '#A6EDEA',
              },
              type: 'STATIC',
            },
            icon: {
              options: {
                value: 'home',
              },
              type: 'STATIC',
            },
            iconSize: {
              options: {
                size: 8,
              },
              type: 'STATIC',
            },
            lineColor: {
              options: {
                color: '#FFFFFF',
              },
              type: 'STATIC',
            },
            lineWidth: {
              options: {
                size: 2,
              },
              type: 'STATIC',
            },
            symbolizeAs: {
              options: {
                value: 'icon',
              },
            },
          },
          type: 'VECTOR',
        },
        type: 'GEOJSON_VECTOR',
        visible: true,
      },
      {
        __dataRequests: [],
        alpha: 0.75,
        id: '12345',
        include_in_fit_to_bounds: true,
        joins: [],
        label: 'apm-*-transaction* | Destination point',
        max_zoom: 24,
        min_zoom: 0,
        parent: '12345',
        disable_tooltips: false,
        source_descriptor: {
          apply_global_query: true,
          apply_global_time: true,
          filter_by_map_bounds: true,
          geo_field: 'server.geo.location',
          id: '12345',
          index_pattern_id: 'apm_static_data_view_id_default',
          apply_force_refresh: true,
          scaling_type: 'TOP_HITS',
          sort_field: '',
          sort_order: 'desc',
          tooltip_properties: [
            'host.name',
            'server.ip',
            'server.domain',
            'server.geo.country_iso_code',
            'server.as.organization.name',
          ],
          top_hits_group_by_timeseries: false,
          top_hits_size: 1,
          top_hits_split_field: 'server.ip',
          type: 'ES_SEARCH',
        },
        style: {
          is_time_aware: true,
          properties: {
            ...getDefaultStaticProperties(),
            fillColor: {
              options: {
                color: '#61A2FF',
              },
              type: 'STATIC',
            },
            icon: {
              options: {
                value: 'marker',
              },
              type: 'STATIC',
            },
            iconSize: {
              options: {
                size: 8,
              },
              type: 'STATIC',
            },
            lineColor: {
              options: {
                color: '#FFFFFF',
              },
              type: 'STATIC',
            },
            lineWidth: {
              options: {
                size: 2,
              },
              type: 'STATIC',
            },
            symbolizeAs: {
              options: {
                value: 'icon',
              },
            },
          },
          type: 'VECTOR',
        },
        type: 'GEOJSON_VECTOR',
        visible: true,
      },
      {
        __dataRequests: [],
        alpha: 0.75,
        id: '12345',
        include_in_fit_to_bounds: true,
        joins: [],
        label: 'apm-*-transaction* | Line',
        max_zoom: 24,
        min_zoom: 0,
        parent: '12345',
        disable_tooltips: false,
        source_descriptor: {
          apply_global_query: true,
          apply_global_time: true,
          dest_geo_field: 'server.geo.location',
          id: '12345',
          index_pattern_id: 'apm_static_data_view_id_default',
          metrics: [
            {
              field: 'client.bytes',
              type: 'sum',
            },
            {
              field: 'server.bytes',
              type: 'sum',
            },
          ],
          apply_force_refresh: true,
          source_geo_field: 'client.geo.location',
          type: 'ES_PEW_PEW',
        },
        style: {
          is_time_aware: true,
          properties: {
            ...getDefaultStaticProperties(),
            lineColor: {
              options: {
                color: '#A6EDEA',
              },
              type: 'STATIC',
            },
            lineWidth: {
              options: {
                field: {
                  name: 'doc_count',
                  origin: 'source',
                },
                field_meta_options: {
                  is_enabled: true,
                  sigma: 3,
                },
                max_size: 8,
                min_size: 1,
              },
              type: 'DYNAMIC',
            },
          },
          type: 'VECTOR',
        },
        type: 'GEOJSON_VECTOR',
        visible: true,
      },
      {
        id: '12345',
        label: 'apm-*-transaction*',
        type: 'LAYER_GROUP',
        visible: true,
      },
    ]);
  });

  test('non-apm index', () => {
    expect(createSecurityLayerDescriptors('id', 'filebeat-*')).toEqual([
      {
        __dataRequests: [],
        alpha: 0.75,
        id: '12345',
        include_in_fit_to_bounds: true,
        joins: [],
        label: 'filebeat-* | Source Point',
        max_zoom: 24,
        min_zoom: 0,
        parent: '12345',
        disable_tooltips: false,
        source_descriptor: {
          apply_global_query: true,
          apply_global_time: true,
          filter_by_map_bounds: true,
          geo_field: 'source.geo.location',
          id: '12345',
          index_pattern_id: 'id',
          apply_force_refresh: true,
          scaling_type: 'TOP_HITS',
          sort_field: '',
          sort_order: 'desc',
          tooltip_properties: [
            'host.name',
            'source.ip',
            'source.domain',
            'source.geo.country_iso_code',
            'source.as.organization.name',
          ],
          top_hits_group_by_timeseries: false,
          top_hits_size: 1,
          top_hits_split_field: 'source.ip',
          type: 'ES_SEARCH',
        },
        style: {
          is_time_aware: true,
          properties: {
            ...getDefaultStaticProperties(),
            fillColor: {
              options: {
                color: '#A6EDEA',
              },
              type: 'STATIC',
            },
            icon: {
              options: {
                value: 'home',
              },
              type: 'STATIC',
            },
            iconSize: {
              options: {
                size: 8,
              },
              type: 'STATIC',
            },
            lineColor: {
              options: {
                color: '#FFFFFF',
              },
              type: 'STATIC',
            },
            lineWidth: {
              options: {
                size: 2,
              },
              type: 'STATIC',
            },
            symbolizeAs: {
              options: {
                value: 'icon',
              },
            },
          },
          type: 'VECTOR',
        },
        type: 'GEOJSON_VECTOR',
        visible: true,
      },
      {
        __dataRequests: [],
        alpha: 0.75,
        id: '12345',
        include_in_fit_to_bounds: true,
        joins: [],
        label: 'filebeat-* | Destination point',
        max_zoom: 24,
        min_zoom: 0,
        parent: '12345',
        disable_tooltips: false,
        source_descriptor: {
          apply_global_query: true,
          apply_global_time: true,
          filter_by_map_bounds: true,
          geo_field: 'destination.geo.location',
          id: '12345',
          index_pattern_id: 'id',
          apply_force_refresh: true,
          scaling_type: 'TOP_HITS',
          sort_field: '',
          sort_order: 'desc',
          tooltip_properties: [
            'host.name',
            'destination.ip',
            'destination.domain',
            'destination.geo.country_iso_code',
            'destination.as.organization.name',
          ],
          top_hits_group_by_timeseries: false,
          top_hits_size: 1,
          top_hits_split_field: 'destination.ip',
          type: 'ES_SEARCH',
        },
        style: {
          is_time_aware: true,
          properties: {
            ...getDefaultStaticProperties(),
            fillColor: {
              options: {
                color: '#61A2FF',
              },
              type: 'STATIC',
            },
            iconSize: {
              options: {
                size: 8,
              },
              type: 'STATIC',
            },
            lineColor: {
              options: {
                color: '#FFFFFF',
              },
              type: 'STATIC',
            },
            lineWidth: {
              options: {
                size: 2,
              },
              type: 'STATIC',
            },
            symbolizeAs: {
              options: {
                value: 'icon',
              },
            },
          },
          type: 'VECTOR',
        },
        type: 'GEOJSON_VECTOR',
        visible: true,
      },
      {
        __dataRequests: [],
        alpha: 0.75,
        id: '12345',
        include_in_fit_to_bounds: true,
        joins: [],
        label: 'filebeat-* | Line',
        max_zoom: 24,
        min_zoom: 0,
        parent: '12345',
        disable_tooltips: false,
        source_descriptor: {
          apply_global_query: true,
          apply_global_time: true,
          dest_geo_field: 'destination.geo.location',
          id: '12345',
          index_pattern_id: 'id',
          metrics: [
            {
              field: 'source.bytes',
              type: 'sum',
            },
            {
              field: 'destination.bytes',
              type: 'sum',
            },
          ],
          apply_force_refresh: true,
          source_geo_field: 'source.geo.location',
          type: 'ES_PEW_PEW',
        },
        style: {
          is_time_aware: true,
          properties: {
            ...getDefaultStaticProperties(),
            lineColor: {
              options: {
                color: '#A6EDEA',
              },
              type: 'STATIC',
            },
            lineWidth: {
              options: {
                field: {
                  name: 'doc_count',
                  origin: 'source',
                },
                field_meta_options: {
                  is_enabled: true,
                  sigma: 3,
                },
                max_size: 8,
                min_size: 1,
              },
              type: 'DYNAMIC',
            },
          },
          type: 'VECTOR',
        },
        type: 'GEOJSON_VECTOR',
        visible: true,
      },
      {
        id: '12345',
        label: 'filebeat-*',
        type: 'LAYER_GROUP',
        visible: true,
      },
    ]);
  });

  test('apm data stream', () => {
    expect(
      createSecurityLayerDescriptors('apm_static_data_view_id_foo', 'traces-apm-opbean-node')
    ).toEqual([
      {
        __dataRequests: [],
        alpha: 0.75,
        id: '12345',
        include_in_fit_to_bounds: true,
        joins: [],
        label: 'traces-apm-opbean-node | Source Point',
        max_zoom: 24,
        min_zoom: 0,
        parent: '12345',
        disable_tooltips: false,
        source_descriptor: {
          apply_global_query: true,
          apply_global_time: true,
          filter_by_map_bounds: true,
          geo_field: 'client.geo.location',
          id: '12345',
          apply_force_refresh: true,
          index_pattern_id: 'apm_static_data_view_id_foo',
          scaling_type: 'TOP_HITS',
          sort_field: '',
          sort_order: 'desc',
          tooltip_properties: [
            'host.name',
            'client.ip',
            'client.domain',
            'client.geo.country_iso_code',
            'client.as.organization.name',
          ],
          top_hits_group_by_timeseries: false,
          top_hits_size: 1,
          top_hits_split_field: 'client.ip',
          type: 'ES_SEARCH',
        },
        style: {
          is_time_aware: true,
          properties: {
            ...getDefaultStaticProperties(),
            fillColor: {
              options: {
                color: '#A6EDEA',
              },
              type: 'STATIC',
            },
            icon: {
              options: {
                value: 'home',
              },
              type: 'STATIC',
            },
            iconSize: {
              options: {
                size: 8,
              },
              type: 'STATIC',
            },
            lineColor: {
              options: {
                color: '#FFFFFF',
              },
              type: 'STATIC',
            },
            lineWidth: {
              options: {
                size: 2,
              },
              type: 'STATIC',
            },
            symbolizeAs: {
              options: {
                value: 'icon',
              },
            },
          },
          type: 'VECTOR',
        },
        type: 'GEOJSON_VECTOR',
        visible: true,
      },
      {
        __dataRequests: [],
        alpha: 0.75,
        id: '12345',
        include_in_fit_to_bounds: true,
        joins: [],
        label: 'traces-apm-opbean-node | Destination point',
        max_zoom: 24,
        min_zoom: 0,
        parent: '12345',
        disable_tooltips: false,
        source_descriptor: {
          apply_global_query: true,
          apply_global_time: true,
          filter_by_map_bounds: true,
          geo_field: 'server.geo.location',
          id: '12345',
          index_pattern_id: 'apm_static_data_view_id_foo',
          scaling_type: 'TOP_HITS',
          apply_force_refresh: true,
          sort_field: '',
          sort_order: 'desc',
          tooltip_properties: [
            'host.name',
            'server.ip',
            'server.domain',
            'server.geo.country_iso_code',
            'server.as.organization.name',
          ],
          top_hits_group_by_timeseries: false,
          top_hits_size: 1,
          top_hits_split_field: 'server.ip',
          type: 'ES_SEARCH',
        },
        style: {
          is_time_aware: true,
          properties: {
            ...getDefaultStaticProperties(),
            fillColor: {
              options: {
                color: '#61A2FF',
              },
              type: 'STATIC',
            },
            iconSize: {
              options: {
                size: 8,
              },
              type: 'STATIC',
            },
            lineColor: {
              options: {
                color: '#FFFFFF',
              },
              type: 'STATIC',
            },
            lineWidth: {
              options: {
                size: 2,
              },
              type: 'STATIC',
            },
            symbolizeAs: {
              options: {
                value: 'icon',
              },
            },
          },
          type: 'VECTOR',
        },
        type: 'GEOJSON_VECTOR',
        visible: true,
      },
      {
        __dataRequests: [],
        alpha: 0.75,
        id: '12345',
        include_in_fit_to_bounds: true,
        joins: [],
        label: 'traces-apm-opbean-node | Line',
        max_zoom: 24,
        min_zoom: 0,
        parent: '12345',
        disable_tooltips: false,
        source_descriptor: {
          apply_global_query: true,
          apply_global_time: true,
          dest_geo_field: 'server.geo.location',
          id: '12345',
          index_pattern_id: 'apm_static_data_view_id_foo',
          metrics: [
            {
              field: 'client.bytes',
              type: 'sum',
            },
            {
              field: 'server.bytes',
              type: 'sum',
            },
          ],
          apply_force_refresh: true,
          source_geo_field: 'client.geo.location',
          type: 'ES_PEW_PEW',
        },
        style: {
          is_time_aware: true,
          properties: {
            ...getDefaultStaticProperties(),
            lineColor: {
              options: {
                color: '#A6EDEA',
              },
              type: 'STATIC',
            },
            lineWidth: {
              options: {
                field: {
                  name: 'doc_count',
                  origin: 'source',
                },
                field_meta_options: {
                  is_enabled: true,
                  sigma: 3,
                },
                max_size: 8,
                min_size: 1,
              },
              type: 'DYNAMIC',
            },
          },
          type: 'VECTOR',
        },
        type: 'GEOJSON_VECTOR',
        visible: true,
      },
      {
        id: '12345',
        label: 'traces-apm-opbean-node',
        type: 'LAYER_GROUP',
        visible: true,
      },
    ]);
  });
});
