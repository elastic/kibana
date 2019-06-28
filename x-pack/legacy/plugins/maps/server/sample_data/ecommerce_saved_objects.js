/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable max-len */

import { i18n } from '@kbn/i18n';

export const getEcommerceSavedObjects = () => {
  return [
    {
      'id': '2c9c1f60-1909-11e9-919b-ffe5949a18d2',
      'type': 'map',
      'updated_at': '2019-01-15T21:12:56.253Z',
      'version': 5,
      'references': [
        {
          'name': 'layer_1_join_0_index_pattern',
          'type': 'index-pattern',
          'id': 'ff959d40-b880-11e8-a6d9-e546fe2bba5f'
        },
        {
          'name': 'layer_2_join_0_index_pattern',
          'type': 'index-pattern',
          'id': 'ff959d40-b880-11e8-a6d9-e546fe2bba5f'
        },
        {
          'name': 'layer_3_join_0_index_pattern',
          'type': 'index-pattern',
          'id': 'ff959d40-b880-11e8-a6d9-e546fe2bba5f'
        },
        {
          'name': 'layer_4_join_0_index_pattern',
          'type': 'index-pattern',
          'id': 'ff959d40-b880-11e8-a6d9-e546fe2bba5f'
        },
        {
          'name': 'layer_5_source_index_pattern',
          'type': 'index-pattern',
          'id': 'ff959d40-b880-11e8-a6d9-e546fe2bba5f'
        },
        {
          'name': 'layer_6_source_index_pattern',
          'type': 'index-pattern',
          'id': 'ff959d40-b880-11e8-a6d9-e546fe2bba5f'
        }
      ],
      'migrationVersion': {
        'map': '7.2.0'
      },
      'attributes': {
        'title': i18n.translate('xpack.maps.sampleData.ecommerceSpec.mapsTitle', {
          defaultMessage: '[eCommerce] Orders by Country',
        }),
        'description': '',
        'mapStateJSON': '{"zoom":2.11,"center":{"lon":-15.07605,"lat":45.88578},"timeFilters":{"from":"now-7d","to":"now"},"refreshConfig":{"isPaused":true,"interval":0},"query":{"query":"","language":"kuery"}}',
        'layerListJSON': '[{"id":"0hmz5","alpha":1,"sourceDescriptor":{"type":"EMS_TMS","id":"road_map"},"visible":true,"style":{"type":"TILE","properties":{}},"type":"TILE","minZoom":0,"maxZoom":24},{"id":"7ameq","label":null,"minZoom":0,"maxZoom":24,"alpha":1,"sourceDescriptor":{"type":"EMS_FILE","id":"world_countries", "tooltipProperties":["name"]},"visible":true,"style":{"type":"VECTOR","properties":{"fillColor":{"type":"DYNAMIC","options":{"field":{"label":"count of kibana_sample_data_ecommerce:geoip.country_iso_code","name":"__kbnjoin__count_groupby_kibana_sample_data_ecommerce.geoip.country_iso_code","origin":"join"},"color":"Green to Red"}},"lineColor":{"type":"STATIC","options":{"color":"#FFFFFF"}},"lineWidth":{"type":"STATIC","options":{"size":1}},"iconSize":{"type":"STATIC","options":{"size":10}}}},"type":"VECTOR","joins":[{"leftField":"iso2","right":{"id":"741db9c6-8ebb-4ea9-9885-b6b4ac019d14","indexPatternTitle":"kibana_sample_data_ecommerce","term":"geoip.country_iso_code","indexPatternRefName":"layer_1_join_0_index_pattern"}}]},{"id":"jmtgf","label":"United States","minZoom":0,"maxZoom":24,"alpha":1,"sourceDescriptor":{"type":"EMS_FILE","id":"usa_states", "tooltipProperties":["name"]},"visible":true,"style":{"type":"VECTOR","properties":{"fillColor":{"type":"DYNAMIC","options":{"field":{"label":"count of kibana_sample_data_ecommerce:geoip.region_name","name":"__kbnjoin__count_groupby_kibana_sample_data_ecommerce.geoip.region_name","origin":"join"},"color":"Blues"}},"lineColor":{"type":"STATIC","options":{"color":"#FFFFFF"}},"lineWidth":{"type":"STATIC","options":{"size":1}},"iconSize":{"type":"STATIC","options":{"size":10}}}},"type":"VECTOR","joins":[{"leftField":"name","right":{"id":"30a0ec24-49b6-476a-b4ed-6c1636333695","indexPatternTitle":"kibana_sample_data_ecommerce","term":"geoip.region_name","indexPatternRefName":"layer_2_join_0_index_pattern"}}]},{"id":"ui5f8","label":"France","minZoom":0,"maxZoom":24,"alpha":1,"sourceDescriptor":{"type":"EMS_FILE","id":"france_departments", "tooltipProperties":["label_en"]},"visible":true,"style":{"type":"VECTOR","properties":{"fillColor":{"type":"DYNAMIC","options":{"field":{"label":"count of kibana_sample_data_ecommerce:geoip.region_name","name":"__kbnjoin__count_groupby_kibana_sample_data_ecommerce.geoip.region_name","origin":"join"},"color":"Blues"}},"lineColor":{"type":"STATIC","options":{"color":"#FFFFFF"}},"lineWidth":{"type":"STATIC","options":{"size":1}},"iconSize":{"type":"STATIC","options":{"size":10}}}},"type":"VECTOR","joins":[{"leftField":"label_en","right":{"id":"e325c9da-73fa-4b3b-8b59-364b99370826","indexPatternTitle":"kibana_sample_data_ecommerce","term":"geoip.region_name","indexPatternRefName":"layer_3_join_0_index_pattern"}}]},{"id":"y3fjb","label":"United Kingdom","minZoom":0,"maxZoom":24,"alpha":1,"sourceDescriptor":{"type":"EMS_FILE","id":"uk_subdivisions", "tooltipProperties":["label_en"]},"visible":true,"style":{"type":"VECTOR","properties":{"fillColor":{"type":"DYNAMIC","options":{"field":{"label":"count of kibana_sample_data_ecommerce:geoip.region_name","name":"__kbnjoin__count_groupby_kibana_sample_data_ecommerce.geoip.region_name","origin":"join"},"color":"Blues"}},"lineColor":{"type":"STATIC","options":{"color":"#FFFFFF"}},"lineWidth":{"type":"STATIC","options":{"size":1}},"iconSize":{"type":"STATIC","options":{"size":10}}}},"type":"VECTOR","joins":[{"leftField":"label_en","right":{"id":"612d805d-8533-43a9-ac0e-cbf51fe63dcd","indexPatternTitle":"kibana_sample_data_ecommerce","term":"geoip.region_name","indexPatternRefName":"layer_4_join_0_index_pattern"}}]},{"id":"c54wk","label":"Sales","minZoom":9,"maxZoom":24,"alpha":1,"sourceDescriptor":{"id":"04c983b0-8cfa-4e6a-a64b-52c10b7008fe","type":"ES_SEARCH","geoField":"geoip.location","limit":2048,"filterByMapBounds":true,"tooltipProperties":["category","customer_gender","manufacturer","order_id","total_quantity","total_unique_products","taxful_total_price","order_date","geoip.region_name","geoip.country_iso_code"],"indexPatternRefName":"layer_5_source_index_pattern"},"visible":true,"style":{"type":"VECTOR","properties":{"fillColor":{"type":"DYNAMIC","options":{"field":{"label":"taxful_total_price","name":"taxful_total_price","origin":"source"},"color":"Greens"}},"lineColor":{"type":"STATIC","options":{"color":"#FFFFFF"}},"lineWidth":{"type":"STATIC","options":{"size":1}},"iconSize":{"type":"STATIC","options":{"size":10}}}},"type":"VECTOR"},{"id":"qvhh3","label":"Total Sales Revenue","minZoom":0,"maxZoom":9,"alpha":1,"sourceDescriptor":{"type":"ES_GEO_GRID","resolution":"COARSE","id":"aa7f87b8-9dc5-42be-b19e-1a2fa09b6cad","geoField":"geoip.location","requestType":"point","metrics":[{"type":"count"},{"type":"sum","field":"taxful_total_price"}],"indexPatternRefName":"layer_6_source_index_pattern"},"visible":true,"style":{"type":"VECTOR","properties":{"fillColor":{"type":"DYNAMIC","options":{"field":{"label":"Count","name":"doc_count","origin":"source"},"color":"Greens"}},"lineColor":{"type":"STATIC","options":{"color":"#cccccc"}},"lineWidth":{"type":"STATIC","options":{"size":1}},"iconSize":{"type":"DYNAMIC","options":{"field":{"label":"sum of taxful_total_price","name":"sum_of_taxful_total_price","origin":"source"},"minSize":1,"maxSize":20}}}},"type":"VECTOR"}]',
        'uiStateJSON': '{"isDarkMode":false}',
        'bounds': { 'type': 'envelope', 'coordinates': [[-117.50707, 72.64116], [87.35497, -4.16541]] }
      }
    }
  ];
};
