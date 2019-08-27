/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { InternalCoreSetup, SavedObjectAttributes } from 'src/core/server';
import { getSavedObjectsClient } from '../helpers/saved_objects_client';

export const APM_AVG_PAGE_LOAD_BY_COUNTRY_MAP_ID =
  'APM_AVG_PAGE_LOAD_BY_COUNTRY_MAP_ID';

function createAvgTransactionDurationByCountryMap(indexPattern: string) {
  const avgTransactionDurationByCountryMap = {
    attributes: {
      bounds: {
        coordinates: [
          [
            [-180, 76.98426],
            [-180, -30.90334],
            [180, -30.90334],
            [180, 76.98426],
            [-180, 76.98426]
          ]
        ],
        type: 'Polygon'
      },
      description: '',
      layerListJSON: JSON.stringify([
        {
          sourceDescriptor: {
            id: 'road_map_desaturated',
            type: 'EMS_TMS',
            isAutoSelect: false
          },
          style: null,
          id: '35278c3f-1287-43b3-9b18-9d51c81977bb',
          label: null,
          minZoom: 0,
          maxZoom: 24,
          alpha: 1,
          visible: true,
          applyGlobalQuery: true,
          type: 'VECTOR_TILE'
        },
        {
          sourceDescriptor: {
            type: 'EMS_FILE',
            id: 'world_countries',
            tooltipProperties: ['name']
          },
          style: {
            type: 'VECTOR',
            properties: {
              fillColor: {
                type: 'DYNAMIC',
                options: {
                  color: 'Blues',
                  useCustomColorRamp: false,
                  field: {
                    label: 'avg transaction.duration.us',
                    name:
                      '__kbnjoin__avg_of_transaction.duration.us_groupby_apm-*.client.geo.country_iso_code',
                    origin: 'join'
                  }
                }
              },
              lineColor: { type: 'STATIC', options: { color: '#FFFFFF' } },
              lineWidth: { type: 'STATIC', options: { size: 1 } },
              iconSize: { type: 'STATIC', options: { size: 10 } },
              iconOrientation: { type: 'STATIC', options: { orientation: 0 } },
              symbol: {
                options: { symbolizeAs: 'circle', symbolId: 'airfield' }
              }
            }
          },
          id: APM_AVG_PAGE_LOAD_BY_COUNTRY_MAP_ID,
          label: 'Avg page load by client.geo.country_iso_code',
          minZoom: 0,
          maxZoom: 24,
          alpha: 0.75,
          visible: true,
          applyGlobalQuery: true,
          type: 'VECTOR',
          joins: [
            {
              leftField: 'iso2',
              right: {
                id: '54088e32-f11d-4d48-8dd1-7c56cfce0dd6',
                indexPatternTitle: 'apm-*',
                term: 'client.geo.country_iso_code',
                metrics: [
                  {
                    type: 'avg',
                    field: 'transaction.duration.us',
                    label: 'avg transaction.duration.us'
                  }
                ],
                indexPatternRefName: 'layer_1_join_0_index_pattern'
              }
            }
          ]
        }
      ]),
      mapStateJSON: JSON.stringify({
        zoom: 1.41,
        center: { lon: 2.60108, lat: 41.67925 },
        timeFilters: { from: 'now-7d', to: 'now' },
        refreshConfig: { isPaused: false, interval: 0 },
        query: {
          query: 'service.name:"client"  and transaction.type : "page-load"',
          language: 'kuery'
        },
        filters: []
      }),
      title: 'APM - Avg page load by country',
      uiStateJSON: JSON.stringify({
        isLayerTOCOpen: true,
        openTOCDetails: [APM_AVG_PAGE_LOAD_BY_COUNTRY_MAP_ID]
      })
    },
    references: [
      {
        id: indexPattern,
        name: 'layer_1_join_0_index_pattern',
        type: 'index-pattern'
      }
    ]
  };
  return avgTransactionDurationByCountryMap;
}

export function createSavedMaps(core: InternalCoreSetup) {
  const { server } = core.http;
  const indexPattern = server.config().get<string>('apm_oss.indexPattern');
  const avgTransactionDurationByCountryMap = createAvgTransactionDurationByCountryMap(
    indexPattern
  );
  const savedObjectsClient = getSavedObjectsClient(server);
  savedObjectsClient.create(
    'map',
    (avgTransactionDurationByCountryMap.attributes as unknown) as SavedObjectAttributes,
    {
      id: APM_AVG_PAGE_LOAD_BY_COUNTRY_MAP_ID,
      overwrite: true,
      references: avgTransactionDurationByCountryMap.references
    }
  );
}
