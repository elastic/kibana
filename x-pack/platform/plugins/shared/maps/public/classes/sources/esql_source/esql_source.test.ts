/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { ESQLSource } from './esql_source';
import { VECTOR_SHAPE_TYPE } from '../../../../common/constants';
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

jest.mock('@kbn/esql-utils', () => ({
  getESQLQueryColumnsRaw: () => mockGetESQLQueryColumnsRaw(),
  getLimitFromESQLQuery: (...args: any[]) => mockGetLimitFromESQLQuery(...args),
  getStartEndParams: () => [],
  hasStartEndParams: () => false,
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
});
