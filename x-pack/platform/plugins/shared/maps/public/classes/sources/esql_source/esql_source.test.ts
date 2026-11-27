/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { GRID_RESOLUTION } from '@kbn/geo-precision';
import { VECTOR_SHAPE_TYPE } from '../../../../common/constants';
import { ESQLSource } from './esql_source';
import type { DataRequest } from '../../util/data_request';

const mockSearch = jest.fn();
const mockGetESQLQueryColumnsRaw = jest.fn();
const mockGetLimitFromESQLQuery = jest.fn().mockReturnValue(10000);

jest.mock('../../../kibana_services', () => ({
  getData: () => ({
    search: { search: (...args: any[]) => mockSearch(...args) },
    query: {
      timefilter: {
        timefilter: { getAbsoluteTime: () => ({ from: 'now-15m', to: 'now' }) },
      },
    },
  }),
  getUiSettings: () => ({ get: () => undefined }),
  getHttp: () => ({}),
  getIndexPatternService: () => ({}),
}));

const mockGetNamedParams = jest.fn().mockReturnValue([]);

jest.mock('@kbn/esql-utils', () => ({
  getESQLQueryColumnsRaw: () => mockGetESQLQueryColumnsRaw(),
  getLimitFromESQLQuery: (...args: any[]) => mockGetLimitFromESQLQuery(...args),
  getNamedParams: (...args: any[]) => mockGetNamedParams(...args),
  hasStartEndParams: () => false,
  hasAggregatingCommand: (query: string) => /\|\s*stats\b/i.test(query),
  getGeoPrecisionParamValues: (...args: any[]) =>
    jest.requireActual('@kbn/esql-utils').getGeoPrecisionParamValues(...args),
  getIndexPatternFromESQLQuery: () => 'logstash-*',
  getProjectRoutingFromEsqlQuery: () => undefined,
  getESQLAdHocDataview: jest.fn(),
}));

describe('getSupportedShapeTypes', () => {
  beforeEach(() => {
    mockGetESQLQueryColumnsRaw.mockReset();
  });

  test('should return point for geo_point column', async () => {
    mockGetESQLQueryColumnsRaw.mockImplementation(() => [
      {
        name: 'geo.coordinates',
        type: 'geo_point',
      },
    ]);
    const esqlSource = new ESQLSource({
      esql: 'from kibana_sample_data_logs | keep geo.coordinates | limit 10000',
    });
    expect(await esqlSource.getSupportedShapeTypes()).toEqual([VECTOR_SHAPE_TYPE.POINT]);
  });

  test('should return all geometry types for geo_shape column', async () => {
    mockGetESQLQueryColumnsRaw.mockImplementation(() => [
      {
        name: 'geometry',
        type: 'geo_shape',
      },
    ]);
    const esqlSource = new ESQLSource({
      esql: 'from world_countries | keep geometry | limit 10000',
    });
    expect(await esqlSource.getSupportedShapeTypes()).toEqual([
      VECTOR_SHAPE_TYPE.POINT,
      VECTOR_SHAPE_TYPE.LINE,
      VECTOR_SHAPE_TYPE.POLYGON,
    ]);
  });

  test('should fallback to point when geometry column can not be found', async () => {
    mockGetESQLQueryColumnsRaw.mockImplementation(() => []);
    const esqlSource = new ESQLSource({
      esql: 'from world_countries | keep geometry | limit 10000',
    });
    expect(await esqlSource.getSupportedShapeTypes()).toEqual([VECTOR_SHAPE_TYPE.POINT]);
  });
});

describe('getSourceStatus', () => {
  const esqlSource = new ESQLSource({ esql: 'from logstash-* | limit 10000' });

  test('should return null tooltip when no sourceDataRequest provided', () => {
    expect(esqlSource.getSourceStatus()).toEqual({
      tooltipContent: null,
      areResultsTrimmed: false,
    });
  });

  test('should return found rows message when results are not trimmed', () => {
    const mockDataRequest = {
      getMeta: () => ({ resultsCount: 5, areResultsTrimmed: false }),
    } as unknown as DataRequest;
    expect(esqlSource.getSourceStatus(mockDataRequest)).toEqual({
      tooltipContent: 'Found 5 rows.',
      areResultsTrimmed: false,
    });
  });

  test('should return trimmed message when results are trimmed', () => {
    const mockDataRequest = {
      getMeta: () => ({ resultsCount: 10000, areResultsTrimmed: true }),
    } as unknown as DataRequest;
    expect(esqlSource.getSourceStatus(mockDataRequest)).toEqual({
      tooltipContent: 'Results limited to first 10,000 rows.',
      areResultsTrimmed: true,
    });
  });
});

describe('getGeoJsonWithMeta', () => {
  const ESQL = 'from logstash-* | keep geo.coordinates | limit 10000';

  const requestMeta = {
    isReadOnly: false,
    filters: [],
    zoom: 0,
    fieldNames: [],
    timeFilters: { from: 'now-15m', to: 'now', mode: 'relative' as const },
    sourceMeta: null,
    applyGlobalQuery: false,
    applyGlobalTime: false,
    applyForceRefresh: false,
    isForceRefresh: false,
    isFeatureEditorOpenForLayer: false,
    executionContext: { name: 'maps' },
  };

  const makeInspectorAdapters = () => ({
    requests: {
      start: jest.fn().mockReturnValue({
        json: jest.fn(),
        ok: jest.fn(),
        error: jest.fn(),
      }),
    },
  });

  const makeEsqlResponse = (rowCount: number) => ({
    columns: [{ name: 'geo.coordinates', type: 'geo_point' }],
    values: Array.from({ length: rowCount }, (_, i) => [`POINT (${i} ${i})`]),
  });

  const createSource = () =>
    new ESQLSource({
      esql: ESQL,
      geoField: 'geo.coordinates',
      narrowByGlobalSearch: false,
      narrowByMapBounds: false,
      narrowByGlobalTime: false,
    });

  beforeEach(() => {
    mockSearch.mockReset();
    mockGetLimitFromESQLQuery.mockReturnValue(10000);
    mockGetNamedParams.mockReset().mockReturnValue([]);
  });

  test('should return features and resultsCount from ES|QL response', async () => {
    mockSearch.mockReturnValue(of({ rawResponse: makeEsqlResponse(5), requestParams: {} }));

    const { data, meta } = await createSource().getGeoJsonWithMeta(
      'test',
      requestMeta as any,
      jest.fn(),
      jest.fn(),
      makeInspectorAdapters() as any
    );

    expect(data.features).toHaveLength(5);
    expect(meta?.resultsCount).toBe(5);
    expect(meta?.areResultsTrimmed).toBe(false);
  });

  test('should set areResultsTrimmed when resultsCount reaches the limit', async () => {
    mockGetLimitFromESQLQuery.mockReturnValue(3);
    mockSearch.mockReturnValue(of({ rawResponse: makeEsqlResponse(3), requestParams: {} }));

    const { meta } = await createSource().getGeoJsonWithMeta(
      'test',
      requestMeta as any,
      jest.fn(),
      jest.fn(),
      makeInspectorAdapters() as any
    );

    expect(meta?.resultsCount).toBe(3);
    expect(meta?.areResultsTrimmed).toBe(true);
  });

  test('should bind ?_geotile_precision to a precision derived from the map zoom', async () => {
    mockGetNamedParams.mockReturnValue([{ geotile: 9 }]);
    mockSearch.mockReturnValue(of({ rawResponse: makeEsqlResponse(1), requestParams: {} }));

    await createSource().getGeoJsonWithMeta(
      'test',
      { ...requestMeta, zoom: 4.5 } as any,
      jest.fn(),
      jest.fn(),
      makeInspectorAdapters() as any
    );

    expect(mockGetNamedParams).toHaveBeenCalledWith(ESQL, expect.anything(), undefined, {
      zoom: 4.5,
      resolution: GRID_RESOLUTION.FINE,
    });
    expect(mockSearch.mock.calls[0][0].params.params).toEqual([{ geotile: 9 }]);
  });
});

describe('getSyncMeta', () => {
  const createSource = (esql: string) =>
    new ESQLSource({
      esql,
      geoField: 'geo.coordinates',
      narrowByGlobalSearch: false,
      narrowByMapBounds: false,
      narrowByGlobalTime: false,
    });
  const GEOTILE_ESQL =
    'FROM logs | STATS count = COUNT(*) BY ST_GEOTILE(geo.coordinates, ?_geotile_precision)';

  test('should include geotile precision derived from zoom when the query uses ?_geotile_precision', () => {
    const source = createSource(GEOTILE_ESQL);
    expect(source.getSyncMeta({ zoom: 4.2 } as any)).toMatchObject({ geotile: 8 });
    expect(source.getSyncMeta({ zoom: 4.9 } as any)).toMatchObject({ geotile: 8 });
    expect(source.getSyncMeta({ zoom: 5.1 } as any)).toMatchObject({ geotile: 9 });
  });

  test('should not include geotile precision when the query does not use ?_geotile_precision', () => {
    const source = createSource('FROM logs');
    expect(source.getSyncMeta({ zoom: 4.2 } as any)).not.toHaveProperty('geotile');
  });
});

describe('getGeotilePrecision', () => {
  const createSource = (resolution?: GRID_RESOLUTION) =>
    new ESQLSource({
      esql: 'FROM logs | STATS BY ST_GEOTILE(geo.coordinates, ?_geotile_precision)',
      geoField: 'geo.coordinates',
      resolution,
    });

  test('should default to fine resolution', () => {
    expect(createSource().getSyncMeta({ zoom: 4.5 } as any)).toMatchObject({
      geotile: 8,
    });
  });

  test.each([
    [GRID_RESOLUTION.COARSE, 7],
    [GRID_RESOLUTION.FINE, 8],
    [GRID_RESOLUTION.MOST_FINE, 9],
    [GRID_RESOLUTION.SUPER_FINE, 13],
  ])('should use source resolution %s', (resolution, expected) => {
    const source = createSource(resolution);
    expect(source.getSyncMeta({ zoom: 4.5 } as any)).toMatchObject({
      geotile: expected,
    });
  });
});

describe('getGeohexPrecision', () => {
  const GEOHEX_ESQL = 'FROM logs | STATS BY ST_GEOHEX(geo.coordinates, ?_geohex_precision)';
  const createSource = (esql: string, resolution?: GRID_RESOLUTION) =>
    new ESQLSource({ esql, geoField: 'geo.coordinates', resolution });

  test('should default to fine resolution', () => {
    expect(createSource(GEOHEX_ESQL).getSyncMeta({ zoom: 4.5 } as any)).toMatchObject({
      geohex: 4,
    });
  });

  test.each([
    [GRID_RESOLUTION.COARSE, 3], // geotile level 7
    [GRID_RESOLUTION.FINE, 4], // geotile level 10
    [GRID_RESOLUTION.MOST_FINE, 4], // geotile level 10
    [GRID_RESOLUTION.SUPER_FINE, 6], // geotile level 13
  ])('should use source resolution %s', (resolution, expected) => {
    const source = createSource(GEOHEX_ESQL, resolution);
    expect(source.getSyncMeta({ zoom: 4.5 } as any)).toMatchObject({ geohex: expected });
  });

  test('should only include the precision of the params used in the sync meta', () => {
    const geohexMeta = createSource(GEOHEX_ESQL).getSyncMeta({ zoom: 4.5 } as any);
    expect(geohexMeta).toMatchObject({ geohex: 4 });
    expect(createSource('FROM logs').getSyncMeta({ zoom: 4.5 } as any)).not.toHaveProperty(
      'geohex'
    );
  });
});

describe('getGeohashPrecision', () => {
  const GEOHASH_ESQL = 'FROM logs | STATS BY ST_GEOHASH(geo.coordinates, ?_geohash_precision)';
  const createSource = (esql: string, resolution?: GRID_RESOLUTION) =>
    new ESQLSource({ esql, geoField: 'geo.coordinates', resolution });

  test('should default to fine resolution', () => {
    expect(createSource(GEOHASH_ESQL).getSyncMeta({ zoom: 4.5 } as any)).toMatchObject({
      geohash: 3,
    });
  });

  test.each([
    [GRID_RESOLUTION.COARSE, 3],
    [GRID_RESOLUTION.FINE, 3],
    [GRID_RESOLUTION.MOST_FINE, 4],
    [GRID_RESOLUTION.SUPER_FINE, 5],
  ])('should use source resolution %s', (resolution, expected) => {
    const source = createSource(GEOHASH_ESQL, resolution);
    expect(source.getSyncMeta({ zoom: 4.5 } as any)).toMatchObject({
      geohash: expected,
    });
  });

  test('should only include geohash precision in the sync meta when the query uses the param', () => {
    expect(createSource('FROM logs').getSyncMeta({ zoom: 4.5 } as any)).not.toHaveProperty(
      'geohash'
    );
  });
});
