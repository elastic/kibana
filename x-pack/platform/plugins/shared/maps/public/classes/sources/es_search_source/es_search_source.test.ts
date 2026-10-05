/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_ID, ES_GEO_FIELD_TYPE, SCALING_TYPES } from '../../../../common/constants';

jest.mock('../../../kibana_services');
jest.mock('./util/load_index_settings');

import type { SearchSource } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-plugin/common';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { Adapters } from '@kbn/inspector-plugin/common/adapters';
import { decode } from '@kbn/rison';
import { getHttp, getIndexPatternService, getSearchService } from '../../../kibana_services';

import { loadIndexSettings } from './util/load_index_settings';

import type { VectorSourceRequestMeta } from '../../../../common/descriptor_types';
import { ESSearchSource } from './es_search_source';

const mockDescriptor = { indexPatternId: 'foo', geoField: 'bar' };

describe('ESSearchSource', () => {
  it('constructor', () => {
    const esSearchSource = new ESSearchSource(mockDescriptor);
    expect(esSearchSource instanceof ESSearchSource).toBe(true);
  });

  describe('IMvtVectorSource', () => {
    it('getTileSourceLayer', () => {
      const esSearchSource = new ESSearchSource(mockDescriptor);
      expect(esSearchSource.getTileSourceLayer()).toBe('hits');
    });

    describe('getTileUrl', () => {
      const geoFieldName = 'bar';
      const mockIndexPatternService = {
        get() {
          return {
            getIndexPattern: () => 'foobar-title-*',
            title: 'foobar-title-*',
            fields: {
              getByName() {
                return {
                  name: geoFieldName,
                  type: ES_GEO_FIELD_TYPE.GEO_SHAPE,
                };
              },
            },
          };
        },
      };

      beforeEach(async () => {
        const mockSearchSource = {
          getField: (fieldName: string) => {
            if (fieldName === 'filter') {
              return [];
            }

            throw new Error(`Unsupported search source field: ${fieldName}`);
          },
          setField: jest.fn(),
          getSearchRequestBody() {
            return {
              scripted_fields: 'shouldNotGetAddedToTileUrl',
              fields: this.setField.mock.calls,
            };
          },
          setParent() {},
        };
        const mockSearchService = {
          searchSource: {
            async create() {
              return mockSearchSource as unknown as SearchSource;
            },
            createEmpty() {
              return mockSearchSource as unknown as SearchSource;
            },
          },
        };

        // @ts-expect-error
        getIndexPatternService.mockReturnValue(mockIndexPatternService);
        // @ts-expect-error
        getSearchService.mockReturnValue(mockSearchService);
        // @ts-expect-error
        loadIndexSettings.mockReturnValue({
          maxResultWindow: 1000,
        });
        // @ts-expect-error
        getHttp.mockReturnValue({
          basePath: {
            prepend(path: string) {
              return `rootdir${path}`;
            },
          },
        });
      });

      const requestMeta: VectorSourceRequestMeta = {
        isReadOnly: false,
        filters: [],
        zoom: 0,
        fieldNames: ['tooltipField', 'styleField'],
        timeFilters: {
          from: 'now',
          to: '15m',
          mode: 'relative',
        },
        sourceQuery: {
          query: 'tooltipField: foobar',
          language: 'KQL',
        },
        sourceMeta: null,
        applyGlobalQuery: true,
        applyGlobalTime: true,
        applyForceRefresh: true,
        isForceRefresh: false,
        isFeatureEditorOpenForLayer: false,
        executionContext: { name: APP_ID },
      };

      it('should include required props', async () => {
        const esSearchSource = new ESSearchSource({
          geoField: geoFieldName,
          indexPatternId: 'ipId',
        });
        const tileUrl = await esSearchSource.getTileUrl(requestMeta, '1234', false, 5);

        const urlParts = tileUrl.split('?');
        expect(urlParts[0]).toEqual('rootdir/internal/maps/mvt/getTile/{z}/{x}/{y}.pbf');

        const params = new URLSearchParams(urlParts[1]);

        expect(Object.fromEntries(params)).toMatchObject({
          buffer: '5',
          geometryFieldName: 'bar',
          hasLabels: 'false',
          index: 'foobar-title-*',
          requestBody: expect.any(String),
          token: '1234',
        });

        // Verify requestBody data after decoding from Rison
        const requestBody = params.get('requestBody');
        const requestBodyDecoded = requestBody ? decode(requestBody) : {};
        expect(requestBodyDecoded).toEqual({
          fields: {
            '0': { '0': 'index', '1': { fields: {}, title: 'foobar-title-*' } },
            '1': { '0': 'size', '1': 1000 },
            '2': { '0': 'filter', '1': [] },
            '3': { '0': 'query' },
            '4': { '0': 'index', '1': { fields: {}, title: 'foobar-title-*' } },
            '5': { '0': 'query', '1': { language: 'KQL', query: 'tooltipField: foobar' } },
            '6': { '0': 'fieldsFromSource', '1': ['_id'] },
            '7': { '0': 'source', '1': false },
            '8': { '0': 'fields', '1': ['tooltipField', 'styleField'] },
            '9': { '0': 'filter', '1': [{ meta: {}, query: { exists: { field: 'bar' } } }] },
          },
        });
      });

      it('should include executionContextId when provided', async () => {
        const esSearchSource = new ESSearchSource({
          geoField: geoFieldName,
          indexPatternId: 'ipId',
        });
        const tileUrl = await esSearchSource.getTileUrl(
          {
            ...requestMeta,
            executionContext: { name: APP_ID, id: 'map1234' },
          },
          '1234',
          false,
          5
        );
        const urlParts = tileUrl.split('?');
        const params = new URLSearchParams(urlParts[1]);
        expect(Object.fromEntries(params).executionContextId).toEqual('map1234');
      });
    });
  });

  describe('isFilterByMapBounds', () => {
    it('limit', () => {
      const esSearchSource = new ESSearchSource({
        ...mockDescriptor,
        scalingType: SCALING_TYPES.LIMIT,
      });
      expect(esSearchSource.isFilterByMapBounds()).toBe(true);
    });
    it('mvt', () => {
      const esSearchSource = new ESSearchSource({
        ...mockDescriptor,
        scalingType: SCALING_TYPES.MVT,
      });
      expect(esSearchSource.isFilterByMapBounds()).toBe(false);
    });
  });

  describe('supportsJoins', () => {
    it('limit', () => {
      const esSearchSource = new ESSearchSource({
        ...mockDescriptor,
        scalingType: SCALING_TYPES.LIMIT,
      });
      expect(esSearchSource.supportsJoins()).toBe(true);
    });
    it('blended layer', () => {
      const esSearchSource = new ESSearchSource({
        ...mockDescriptor,
        scalingType: SCALING_TYPES.CLUSTERS,
      });
      expect(esSearchSource.supportsJoins()).toBe(false);
    });
    it('mvt', () => {
      const esSearchSource = new ESSearchSource({
        ...mockDescriptor,
        scalingType: SCALING_TYPES.MVT,
      });
      expect(esSearchSource.supportsJoins()).toBe(true);
    });
  });

  describe('getGeoJsonWithMeta', () => {
    const GEO_FIELD_NAME = 'location';

    const makeHit = (id: string) => ({
      _id: id,
      _index: 'test-index',
      fields: {
        [GEO_FIELD_NAME]: [{ type: 'Point', coordinates: [-70, 40] }],
      },
    });

    const makeHits = (count: number) =>
      Array.from({ length: count }, (_, i) => makeHit(`hit-${i}`));

    const mockIndexPattern = {
      flattenHit(hit: Record<string, any>) {
        return {
          _id: hit._id,
          _index: hit._index,
          [GEO_FIELD_NAME]: hit.fields?.[GEO_FIELD_NAME]?.[0],
        };
      },
      metaFields: ['_id', '_index', '_type', '_score'],
      fields: {
        getByName(name: string) {
          return { name, type: 'geo_point', readFromDocValues: false };
        },
      },
    };

    const topHitsRequestMeta: VectorSourceRequestMeta = {
      isReadOnly: false,
      filters: [],
      zoom: 0,
      fieldNames: [GEO_FIELD_NAME],
      timeFilters: { from: 'now', to: '15m', mode: 'relative' },
      sourceMeta: null,
      applyGlobalQuery: true,
      applyGlobalTime: true,
      applyForceRefresh: true,
      isForceRefresh: false,
      isFeatureEditorOpenForLayer: false,
      executionContext: { name: APP_ID },
    };

    describe('top hits', () => {
      it('should return features for each top hit across all entities', async () => {
        const esSearchSource = new ESSearchSource({
          indexPatternId: 'ipId',
          geoField: GEO_FIELD_NAME,
          scalingType: SCALING_TYPES.TOP_HITS,
          topHitsSplitField: 'machine.os.raw',
          topHitsSize: 5,
        });
        jest.spyOn(esSearchSource, '_getTopHits').mockResolvedValue({
          hits: makeHits(10),
          meta: {
            areResultsTrimmed: false,
            areEntitiesTrimmed: false,
            entityCount: 2,
            totalEntities: 2,
            warnings: [],
          },
        });
        jest
          .spyOn(esSearchSource, 'getIndexPattern')
          .mockResolvedValue(mockIndexPattern as unknown as DataView);
        jest.spyOn(esSearchSource, '_getGeoField').mockResolvedValue({
          name: GEO_FIELD_NAME,
          type: ES_GEO_FIELD_TYPE.GEO_POINT,
        } as unknown as DataViewField);

        const { data } = await esSearchSource.getGeoJsonWithMeta(
          'test',
          topHitsRequestMeta,
          jest.fn(),
          jest.fn(),
          {} as unknown as Adapters
        );
        expect(data.features).toHaveLength(10);
      });

      it('should pass through meta from top hits response', async () => {
        const esSearchSource = new ESSearchSource({
          indexPatternId: 'ipId',
          geoField: GEO_FIELD_NAME,
          scalingType: SCALING_TYPES.TOP_HITS,
          topHitsSplitField: 'machine.os.raw',
          topHitsSize: 1,
        });
        const topHitsMeta = {
          areResultsTrimmed: true,
          areEntitiesTrimmed: true,
          entityCount: 10000,
          totalEntities: 20000,
          warnings: [],
        };
        jest.spyOn(esSearchSource, '_getTopHits').mockResolvedValue({
          hits: makeHits(5),
          meta: topHitsMeta,
        });
        jest
          .spyOn(esSearchSource, 'getIndexPattern')
          .mockResolvedValue(mockIndexPattern as unknown as DataView);
        jest.spyOn(esSearchSource, '_getGeoField').mockResolvedValue({
          name: GEO_FIELD_NAME,
          type: ES_GEO_FIELD_TYPE.GEO_POINT,
        } as unknown as DataViewField);

        const { meta } = await esSearchSource.getGeoJsonWithMeta(
          'test',
          topHitsRequestMeta,
          jest.fn(),
          jest.fn(),
          {} as unknown as Adapters
        );
        expect(meta).toEqual(topHitsMeta);
      });
    });
  });
});
