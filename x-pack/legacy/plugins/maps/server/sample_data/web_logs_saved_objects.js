/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

const layerList = [
  {
    'id': '0hmz5',
    'alpha': 1,
    'sourceDescriptor': {
      'type': 'EMS_TMS',
      'isAutoSelect': true
    },
    'visible': true,
    'style': {},
    'type': 'VECTOR_TILE',
    'minZoom': 0,
    'maxZoom': 24
  },
  {
    'id': 'edh66',
    'label': 'Total Requests by Country',
    'minZoom': 0,
    'maxZoom': 24,
    'alpha': 0.5,
    'sourceDescriptor': {
      'type': 'EMS_FILE',
      'id': 'world_countries',
      'tooltipProperties': [
        'name',
        'iso2'
      ]
    },
    'visible': true,
    'style': {
      'type': 'VECTOR',
      'properties': {
        'fillColor': {
          'type': 'DYNAMIC',
          'options': {
            'field': {
              'label': 'count of kibana_sample_data_logs:geo.src',
              'name': '__kbnjoin__count_groupby_kibana_sample_data_logs.geo.src',
              'origin': 'join'
            },
            'color': 'Greys'
          }
        },
        'lineColor': {
          'type': 'STATIC',
          'options': {
            'color': '#FFFFFF'
          }
        },
        'lineWidth': {
          'type': 'STATIC',
          'options': {
            'size': 1
          }
        },
        'iconSize': {
          'type': 'STATIC',
          'options': {
            'size': 10
          }
        }
      }
    },
    'type': 'VECTOR',
    'joins': [
      {
        'leftField': 'iso2',
        'right': {
          'id': '673ff994-fc75-4c67-909b-69fcb0e1060e',
          'indexPatternTitle': 'kibana_sample_data_logs',
          'term': 'geo.src',
          'indexPatternRefName': 'layer_1_join_0_index_pattern',
          'metrics': [
            {
              'type': 'count',
              'label': 'web logs count'
            }
          ]
        }
      }
    ]
  },
  {
    'id': 'gaxya',
    'label': 'Actual Requests',
    'minZoom': 9,
    'maxZoom': 24,
    'alpha': 1,
    'sourceDescriptor': {
      'id': 'b7486535-171b-4d3b-bb2e-33c1a0a2854c',
      'type': 'ES_SEARCH',
      'geoField': 'geo.coordinates',
      'limit': 2048,
      'filterByMapBounds': true,
      'tooltipProperties': [
        'clientip',
        'timestamp',
        'host',
        'request',
        'response',
        'machine.os',
        'agent',
        'bytes'
      ],
      'indexPatternRefName': 'layer_2_source_index_pattern'
    },
    'visible': true,
    'style': {
      'type': 'VECTOR',
      'properties': {
        'fillColor': {
          'type': 'STATIC',
          'options': {
            'color': '#2200ff'
          }
        },
        'lineColor': {
          'type': 'STATIC',
          'options': {
            'color': '#FFFFFF'
          }
        },
        'lineWidth': {
          'type': 'STATIC',
          'options': {
            'size': 2
          }
        },
        'iconSize': {
          'type': 'DYNAMIC',
          'options': {
            'field': {
              'label': 'bytes',
              'name': 'bytes',
              'origin': 'source'
            },
            'minSize': 1,
            'maxSize': 23
          }
        }
      }
    },
    'type': 'VECTOR'
  },
  {
    'id': 'tfi3f',
    'label': 'Total Requests and Bytes',
    'minZoom': 0,
    'maxZoom': 9,
    'alpha': 1,
    'sourceDescriptor': {
      'type': 'ES_GEO_GRID',
      'resolution': 'COARSE',
      'id': '8aaa65b5-a4e9-448b-9560-c98cb1c5ac5b',
      'geoField': 'geo.coordinates',
      'requestType': 'point',
      'metrics': [
        {
          'type': 'count',
          'label': 'web logs count'
        },
        {
          'type': 'sum',
          'field': 'bytes'
        }
      ],
      'indexPatternRefName': 'layer_3_source_index_pattern'
    },
    'visible': true,
    'style': {
      'type': 'VECTOR',
      'properties': {
        'fillColor': {
          'type': 'DYNAMIC',
          'options': {
            'field': {
              'label': 'Count',
              'name': 'doc_count',
              'origin': 'source'
            },
            'color': 'Blues'
          }
        },
        'lineColor': {
          'type': 'STATIC',
          'options': {
            'color': '#cccccc'
          }
        },
        'lineWidth': {
          'type': 'STATIC',
          'options': {
            'size': 1
          }
        },
        'iconSize': {
          'type': 'DYNAMIC',
          'options': {
            'field': {
              'label': 'sum of bytes',
              'name': 'sum_of_bytes',
              'origin': 'source'
            },
            'minSize': 1,
            'maxSize': 25
          }
        }
      }
    },
    'type': 'VECTOR'
  }
];

export const getWebLogsSavedObjects = () => {
  return [
    {
      'id': 'de71f4f0-1902-11e9-919b-ffe5949a18d2',
      'type': 'map',
      'updated_at': '2019-01-15T20:30:25.436Z',
      'version': 5,
      'references': [
        {
          'name': 'layer_1_join_0_index_pattern',
          'type': 'index-pattern',
          'id': '90943e30-9a47-11e8-b64d-95841ca0b247'
        },
        {
          'name': 'layer_2_source_index_pattern',
          'type': 'index-pattern',
          'id': '90943e30-9a47-11e8-b64d-95841ca0b247'
        },
        {
          'name': 'layer_3_source_index_pattern',
          'type': 'index-pattern',
          'id': '90943e30-9a47-11e8-b64d-95841ca0b247'
        }
      ],
      'migrationVersion': {
        'map': '7.4.0'
      },
      'attributes': {
        'title': i18n.translate('xpack.maps.sampleData.flightaSpec.logsTitle', {
          defaultMessage: '[Logs] Total Requests and Bytes'
        }),
        'description': '',
        'mapStateJSON': '{"zoom":3.64,"center":{"lon":-88.92107,"lat":42.16337},"timeFilters":{"from":"now-7d","to":"now"},"refreshConfig":{"isPaused":true,"interval":0},"query":{"language":"kuery","query":""}}',
        'layerListJSON': JSON.stringify(layerList),
        'uiStateJSON': '{"isDarkMode":false}',
        'bounds': { 'type': 'envelope', 'coordinates': [[-124.45342, 54.91445], [-53.38872, 26.21461]] }
      }
    }
  ];
};
