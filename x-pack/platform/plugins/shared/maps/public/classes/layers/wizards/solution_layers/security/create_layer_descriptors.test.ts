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
        includeInFitToBounds: true,
        joins: [],
        label: 'apm-*-transaction* | Source Point',
        maxZoom: 24,
        minZoom: 0,
        parent: '12345',
        disableTooltips: false,
        sourceDescriptor: {
          applyGlobalQuery: true,
          applyGlobalTime: true,
          filterByMapBounds: true,
          geoField: 'client.geo.location',
          id: '12345',
          indexPatternId: 'apm_static_data_view_id_default',
          applyForceRefresh: true,
          scalingType: 'TOP_HITS',
          sortField: '',
          sortOrder: 'desc',
          tooltipProperties: [
            'host.name',
            'client.ip',
            'client.domain',
            'client.geo.country_iso_code',
            'client.as.organization.name',
          ],
          topHitsGroupByTimeseries: false,
          topHitsSize: 1,
          topHitsSplitField: 'client.ip',
          type: 'ES_SEARCH',
        },
        style: {
          isTimeAware: true,
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
        includeInFitToBounds: true,
        joins: [],
        label: 'apm-*-transaction* | Destination point',
        maxZoom: 24,
        minZoom: 0,
        parent: '12345',
        disableTooltips: false,
        sourceDescriptor: {
          applyGlobalQuery: true,
          applyGlobalTime: true,
          filterByMapBounds: true,
          geoField: 'server.geo.location',
          id: '12345',
          indexPatternId: 'apm_static_data_view_id_default',
          applyForceRefresh: true,
          scalingType: 'TOP_HITS',
          sortField: '',
          sortOrder: 'desc',
          tooltipProperties: [
            'host.name',
            'server.ip',
            'server.domain',
            'server.geo.country_iso_code',
            'server.as.organization.name',
          ],
          topHitsGroupByTimeseries: false,
          topHitsSize: 1,
          topHitsSplitField: 'server.ip',
          type: 'ES_SEARCH',
        },
        style: {
          isTimeAware: true,
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
        includeInFitToBounds: true,
        joins: [],
        label: 'apm-*-transaction* | Line',
        maxZoom: 24,
        minZoom: 0,
        parent: '12345',
        disableTooltips: false,
        sourceDescriptor: {
          applyGlobalQuery: true,
          applyGlobalTime: true,
          destGeoField: 'server.geo.location',
          id: '12345',
          indexPatternId: 'apm_static_data_view_id_default',
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
          applyForceRefresh: true,
          sourceGeoField: 'client.geo.location',
          type: 'ES_PEW_PEW',
        },
        style: {
          isTimeAware: true,
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
                fieldMetaOptions: {
                  isEnabled: true,
                  sigma: 3,
                },
                maxSize: 8,
                minSize: 1,
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
        sourceDescriptor: null,
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
        includeInFitToBounds: true,
        joins: [],
        label: 'filebeat-* | Source Point',
        maxZoom: 24,
        minZoom: 0,
        parent: '12345',
        disableTooltips: false,
        sourceDescriptor: {
          applyGlobalQuery: true,
          applyGlobalTime: true,
          filterByMapBounds: true,
          geoField: 'source.geo.location',
          id: '12345',
          indexPatternId: 'id',
          applyForceRefresh: true,
          scalingType: 'TOP_HITS',
          sortField: '',
          sortOrder: 'desc',
          tooltipProperties: [
            'host.name',
            'source.ip',
            'source.domain',
            'source.geo.country_iso_code',
            'source.as.organization.name',
          ],
          topHitsGroupByTimeseries: false,
          topHitsSize: 1,
          topHitsSplitField: 'source.ip',
          type: 'ES_SEARCH',
        },
        style: {
          isTimeAware: true,
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
        includeInFitToBounds: true,
        joins: [],
        label: 'filebeat-* | Destination point',
        maxZoom: 24,
        minZoom: 0,
        parent: '12345',
        disableTooltips: false,
        sourceDescriptor: {
          applyGlobalQuery: true,
          applyGlobalTime: true,
          filterByMapBounds: true,
          geoField: 'destination.geo.location',
          id: '12345',
          indexPatternId: 'id',
          applyForceRefresh: true,
          scalingType: 'TOP_HITS',
          sortField: '',
          sortOrder: 'desc',
          tooltipProperties: [
            'host.name',
            'destination.ip',
            'destination.domain',
            'destination.geo.country_iso_code',
            'destination.as.organization.name',
          ],
          topHitsGroupByTimeseries: false,
          topHitsSize: 1,
          topHitsSplitField: 'destination.ip',
          type: 'ES_SEARCH',
        },
        style: {
          isTimeAware: true,
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
        includeInFitToBounds: true,
        joins: [],
        label: 'filebeat-* | Line',
        maxZoom: 24,
        minZoom: 0,
        parent: '12345',
        disableTooltips: false,
        sourceDescriptor: {
          applyGlobalQuery: true,
          applyGlobalTime: true,
          destGeoField: 'destination.geo.location',
          id: '12345',
          indexPatternId: 'id',
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
          applyForceRefresh: true,
          sourceGeoField: 'source.geo.location',
          type: 'ES_PEW_PEW',
        },
        style: {
          isTimeAware: true,
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
                fieldMetaOptions: {
                  isEnabled: true,
                  sigma: 3,
                },
                maxSize: 8,
                minSize: 1,
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
        sourceDescriptor: null,
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
        includeInFitToBounds: true,
        joins: [],
        label: 'traces-apm-opbean-node | Source Point',
        maxZoom: 24,
        minZoom: 0,
        parent: '12345',
        disableTooltips: false,
        sourceDescriptor: {
          applyGlobalQuery: true,
          applyGlobalTime: true,
          filterByMapBounds: true,
          geoField: 'client.geo.location',
          id: '12345',
          applyForceRefresh: true,
          indexPatternId: 'apm_static_data_view_id_foo',
          scalingType: 'TOP_HITS',
          sortField: '',
          sortOrder: 'desc',
          tooltipProperties: [
            'host.name',
            'client.ip',
            'client.domain',
            'client.geo.country_iso_code',
            'client.as.organization.name',
          ],
          topHitsGroupByTimeseries: false,
          topHitsSize: 1,
          topHitsSplitField: 'client.ip',
          type: 'ES_SEARCH',
        },
        style: {
          isTimeAware: true,
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
        includeInFitToBounds: true,
        joins: [],
        label: 'traces-apm-opbean-node | Destination point',
        maxZoom: 24,
        minZoom: 0,
        parent: '12345',
        disableTooltips: false,
        sourceDescriptor: {
          applyGlobalQuery: true,
          applyGlobalTime: true,
          filterByMapBounds: true,
          geoField: 'server.geo.location',
          id: '12345',
          indexPatternId: 'apm_static_data_view_id_foo',
          scalingType: 'TOP_HITS',
          applyForceRefresh: true,
          sortField: '',
          sortOrder: 'desc',
          tooltipProperties: [
            'host.name',
            'server.ip',
            'server.domain',
            'server.geo.country_iso_code',
            'server.as.organization.name',
          ],
          topHitsGroupByTimeseries: false,
          topHitsSize: 1,
          topHitsSplitField: 'server.ip',
          type: 'ES_SEARCH',
        },
        style: {
          isTimeAware: true,
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
        includeInFitToBounds: true,
        joins: [],
        label: 'traces-apm-opbean-node | Line',
        maxZoom: 24,
        minZoom: 0,
        parent: '12345',
        disableTooltips: false,
        sourceDescriptor: {
          applyGlobalQuery: true,
          applyGlobalTime: true,
          destGeoField: 'server.geo.location',
          id: '12345',
          indexPatternId: 'apm_static_data_view_id_foo',
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
          applyForceRefresh: true,
          sourceGeoField: 'client.geo.location',
          type: 'ES_PEW_PEW',
        },
        style: {
          isTimeAware: true,
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
                fieldMetaOptions: {
                  isEnabled: true,
                  sigma: 3,
                },
                maxSize: 8,
                minSize: 1,
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
        sourceDescriptor: null,
        type: 'LAYER_GROUP',
        visible: true,
      },
    ]);
  });
});
