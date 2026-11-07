/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DEFAULT_EMS_ROADMAP_DESATURATED_ID } from '@kbn/maps-ems-plugin/common';

const layerList = [
  {
    id: '0hmz5',
    alpha: 1,
    sourceDescriptor: {
      type: 'EMS_TMS',
      isAutoSelect: true,
      lightModeDefault: DEFAULT_EMS_ROADMAP_DESATURATED_ID,
    },
    visible: true,
    style: {},
    type: 'VECTOR_TILE',
    minZoom: 0,
    maxZoom: 24,
  },
  {
    id: 'jzppx',
    label: 'Flights',
    minZoom: 8,
    maxZoom: 24,
    alpha: 1,
    sourceDescriptor: {
      id: '040e0f25-9687-4569-a1e0-76f1a108da56',
      type: 'ES_SEARCH',
      geoField: 'DestLocation',
      limit: 2048,
      filterByMapBounds: true,
      tooltipProperties: [
        'Carrier',
        'DestCityName',
        'DestCountry',
        'OriginCityName',
        'OriginCountry',
        'FlightDelayMin',
        'FlightTimeMin',
        'DistanceMiles',
        'AvgTicketPrice',
        'FlightDelay',
      ],
      applyGlobalQuery: true,
      scalingType: 'MVT',
      sortField: 'timestamp',
      indexPatternRefName: 'layer_1_source_index_pattern',
    },
    visible: true,
    style: {
      type: 'VECTOR',
      properties: {
        icon: {
          type: 'STATIC',
          options: {
            value: 'marker',
          },
        },
        fill_color: {
          type: 'DYNAMIC',
          options: {
            field: {
              name: 'FlightDelayMin',
              origin: 'source',
            },
            color: 'Yellow to Red',
            field_meta_options: {
              isEnabled: false,
              sigma: 3,
            },
            type: 'ORDINAL',
            use_custom_color_ramp: false,
          },
        },
        line_color: {
          type: 'STATIC',
          options: {
            color: '#000',
          },
        },
        line_width: {
          type: 'STATIC',
          options: {
            size: 1,
          },
        },
        icon_size: {
          type: 'STATIC',
          options: {
            size: 6,
          },
        },
        icon_orientation: {
          type: 'STATIC',
          options: {
            orientation: 0,
          },
        },
        label_text: {
          type: 'STATIC',
          options: {
            value: '',
          },
        },
        label_color: {
          type: 'STATIC',
          options: {
            color: '#000000',
          },
        },
        label_size: {
          type: 'STATIC',
          options: {
            size: 14,
          },
        },
        label_border_color: {
          type: 'STATIC',
          options: {
            color: '#FFFFFF',
          },
        },
        symbolize_as: {
          options: {
            value: 'circle',
          },
        },
        label_border_size: {
          options: {
            size: 'SMALL',
          },
        },
      },
      isTimeAware: true,
    },
    type: 'TILED_VECTOR',
  },
  {
    id: 'y4jsz',
    label: 'Flight Origin Location',
    minZoom: 0,
    maxZoom: 8,
    alpha: 1,
    sourceDescriptor: {
      type: 'ES_GEO_GRID',
      resolution: 'COARSE',
      id: 'fe893f84-388e-4865-8df4-650748533a77',
      geoField: 'OriginLocation',
      requestType: 'point',
      metrics: [
        {
          type: 'count',
          label: 'flight count',
        },
        {
          type: 'sum',
          field: 'FlightDelayMin',
        },
      ],
      applyGlobalQuery: true,
      indexPatternRefName: 'layer_2_source_index_pattern',
    },
    visible: true,
    style: {
      type: 'VECTOR',
      properties: {
        icon: {
          type: 'STATIC',
          options: {
            value: 'marker',
          },
        },
        fill_color: {
          type: 'DYNAMIC',
          options: {
            color: 'Yellow to Red',
            field_meta_options: {
              isEnabled: false,
              sigma: 3,
            },
            type: 'ORDINAL',
            use_custom_color_ramp: false,
            field: {
              name: 'sum_of_FlightDelayMin',
              origin: 'source',
            },
          },
        },
        line_color: {
          type: 'STATIC',
          options: {
            color: '#110081',
          },
        },
        line_width: {
          type: 'STATIC',
          options: {
            size: 1,
          },
        },
        icon_size: {
          type: 'DYNAMIC',
          options: {
            field: {
              origin: 'source',
              name: 'doc_count',
            },
            min_size: 4,
            max_size: 32,
            field_meta_options: {
              isEnabled: false,
              sigma: 3,
            },
          },
        },
        icon_orientation: {
          type: 'STATIC',
          options: {
            orientation: 0,
          },
        },
        label_text: {
          type: 'STATIC',
          options: {
            value: '',
          },
        },
        label_color: {
          type: 'STATIC',
          options: {
            color: '#000000',
          },
        },
        label_size: {
          type: 'STATIC',
          options: {
            size: 14,
          },
        },
        label_border_color: {
          type: 'STATIC',
          options: {
            color: '#FFFFFF',
          },
        },
        symbolize_as: {
          options: {
            value: 'circle',
          },
        },
        label_border_size: {
          options: {
            size: 'SMALL',
          },
        },
      },
      isTimeAware: true,
    },
    type: 'VECTOR',
  },
];

export const getFlightsSavedObjects = () => {
  return [
    {
      id: '5dd88580-1906-11e9-919b-ffe5949a18d2',
      type: 'map',
      updated_at: '2021-07-07T02:20:04.294Z',
      version: '3',
      attributes: {
        title: i18n.translate('xpack.maps.sampleData.flightsSpec.mapsTitle', {
          defaultMessage: '[Flights] Origin Time Delayed',
        }),
        description: '',
        layerListJSON: JSON.stringify(layerList),
        mapStateJSON:
          '{"zoom":4.28,"center":{"lon":-112.44472,"lat":34.65823},"timeFilters":{"from":"now-7d","to":"now"},"refreshConfig":{"isPaused":true,"interval":0},"query":{"query":"","language":"kuery"},"filters":[],"settings":{"autoFitToDataBounds":false,"backgroundColor":"#ffffff","disableInteractive":false,"disableTooltipControl":false,"hideToolbarOverlay":false,"hideLayerControl":false,"hideViewControl":false,"initialLocation":"LAST_SAVED_LOCATION","fixedLocation":{"lat":0,"lon":0,"zoom":2},"browserLocation":{"zoom":2},"maxZoom":24,"minZoom":0,"projection":"globeInterpolate","showScaleControl":false,"showSpatialFilters":true,"showTimesliderToggleButton":true,"spatialFiltersAlpa":0.3,"spatialFiltersFillColor":"#DA8B45","spatialFiltersLineColor":"#DA8B45"}}',
        title: '[Flights] Origin Time Delayed',
        uiStateJSON: '{"isLayerTOCOpen":true,"openTOCDetails":[]}',
      },
      migrationVersion: {
        map: '7.14.0',
      },
      references: [
        {
          id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
          name: 'layer_1_source_index_pattern',
          type: 'index-pattern',
        },
        {
          id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
          name: 'layer_2_source_index_pattern',
          type: 'index-pattern',
        },
      ],
    },
  ];
};
