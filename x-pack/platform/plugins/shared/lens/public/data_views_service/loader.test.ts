/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsContract, DataViewField } from '@kbn/data-views-plugin/public';
import type { HttpStart } from '@kbn/core/public';
import { TIMEFIELD_ROUTE } from '@kbn/esql-types';
import {
  ensureIndexPattern,
  loadIndexPatternRefs,
  loadIndexPatterns,
  buildIndexPatternField,
} from './loader';
import { sampleIndexPatterns, mockDataViewsService } from './mocks';
import { documentField } from '../datasources/form_based/document_field';

describe('loader', () => {
  describe('loadIndexPatternRefs', () => {
    it('should return a list of sorted indexpattern refs', async () => {
      const refs = await loadIndexPatternRefs(mockDataViewsService());
      expect(refs[0].title < refs[1].title).toBeTruthy();
    });
  });

  describe('loadIndexPatterns', () => {
    it('should not load index patterns that are already loaded', async () => {
      const dataViewsService = mockDataViewsService();
      dataViewsService.get = jest.fn(() =>
        Promise.reject('mockIndexPatternService.get should not have been called')
      );

      const cache = await loadIndexPatterns({
        cache: sampleIndexPatterns,
        patterns: ['1', '2'],
        dataViews: dataViewsService,
      });

      expect(cache).toEqual(sampleIndexPatterns);
    });

    it('should load index patterns that are not loaded', async () => {
      const cache = await loadIndexPatterns({
        cache: {
          '2': sampleIndexPatterns['2'],
        },
        patterns: ['1', '2'],
        dataViews: mockDataViewsService(),
      });

      expect(Object.keys(cache)).toEqual(['1', '2']);
    });

    it('should apply field restrictions from typeMeta', async () => {
      const cache = await loadIndexPatterns({
        cache: {},
        patterns: ['foo'],
        dataViews: {
          get: jest.fn(async () => ({
            id: 'foo',
            title: 'Foo index',
            metaFields: [],
            isPersisted: () => true,
            toSpec: () => ({}),
            typeMeta: {
              aggs: {
                date_histogram: {
                  timestamp: {
                    agg: 'date_histogram',
                    fixed_interval: 'm',
                  },
                },
                sum: {
                  bytes: {
                    agg: 'sum',
                  },
                },
              },
            },
            fields: [
              {
                name: 'timestamp',
                displayName: 'timestampLabel',
                type: 'date',
                aggregatable: true,
                searchable: true,
              },
              {
                name: 'bytes',
                displayName: 'bytes',
                type: 'number',
                aggregatable: true,
                searchable: true,
              },
            ],
          })),
          getIdsWithTitle: jest.fn(async () => ({
            id: 'foo',
            title: 'Foo index',
          })),
          create: jest.fn(),
          clearInstanceCache: jest.fn(),
        } as unknown as Pick<
          DataViewsContract,
          'get' | 'getIdsWithTitle' | 'create' | 'clearInstanceCache'
        >,
      });

      expect(cache.foo.getFieldByName('bytes')!.aggregationRestrictions).toEqual({
        sum: { agg: 'sum' },
      });
      expect(cache.foo.getFieldByName('timestamp')!.aggregationRestrictions).toEqual({
        date_histogram: { agg: 'date_histogram', fixed_interval: 'm' },
      });
    });

    it('should map meta flag', async () => {
      const cache = await loadIndexPatterns({
        cache: {},
        patterns: ['foo'],
        dataViews: {
          get: jest.fn(async () => ({
            id: 'foo',
            title: 'Foo index',
            metaFields: ['timestamp'],
            isPersisted: () => true,
            toSpec: () => ({}),
            typeMeta: {
              aggs: {
                date_histogram: {
                  timestamp: {
                    agg: 'date_histogram',
                    fixed_interval: 'm',
                  },
                },
                sum: {
                  bytes: {
                    agg: 'sum',
                  },
                },
              },
            },
            fields: [
              {
                name: 'timestamp',
                displayName: 'timestampLabel',
                type: 'date',
                aggregatable: true,
                searchable: true,
              },
              {
                name: 'bytes',
                displayName: 'bytes',
                type: 'number',
                aggregatable: true,
                searchable: true,
              },
            ],
          })),
          getIdsWithTitle: jest.fn(async () => ({
            id: 'foo',
            title: 'Foo index',
          })),
          create: jest.fn(),
          clearInstanceCache: jest.fn(),
        } as unknown as Pick<
          DataViewsContract,
          'get' | 'getIdsWithTitle' | 'create' | 'clearInstanceCache'
        >,
      });

      expect(cache.foo.getFieldByName('timestamp')!.meta).toEqual(true);
    });

    it('should move over any time series meta data', async () => {
      const cache = await loadIndexPatterns({
        cache: {},
        patterns: ['foo'],
        dataViews: {
          get: jest.fn(async () => ({
            id: 'foo',
            title: 'Foo index',
            metaFields: ['timestamp'],
            isPersisted: () => true,
            toSpec: () => ({}),
            typeMeta: {},
            fields: [
              {
                name: 'timestamp',
                displayName: 'timestampLabel',
                type: 'date',
                aggregatable: true,
                searchable: true,
              },
              {
                name: 'bytes_counter',
                displayName: 'bytes_counter',
                type: 'number',
                aggregatable: true,
                searchable: true,
                timeSeriesMetric: 'counter',
              },
              {
                name: 'bytes_gauge',
                displayName: 'bytes_gauge',
                type: 'number',
                aggregatable: true,
                searchable: true,
                timeSeriesMetric: 'gauge',
              },
              {
                name: 'dimension',
                displayName: 'dimension',
                type: 'string',
                aggregatable: true,
                searchable: true,
                timeSeriesDimension: true,
              },
            ],
          })),
          getIdsWithTitle: jest.fn(async () => ({
            id: 'foo',
            title: 'Foo index',
          })),
          create: jest.fn(),
          clearInstanceCache: jest.fn(),
        } as unknown as Pick<
          DataViewsContract,
          'get' | 'getIdsWithTitle' | 'create' | 'clearInstanceCache'
        >,
      });

      expect(cache.foo.getFieldByName('bytes_counter')!.timeSeriesMetric).toEqual('counter');
      expect(cache.foo.getFieldByName('bytes_gauge')!.timeSeriesMetric).toEqual('gauge');
      expect(cache.foo.getFieldByName('dimension')!.timeSeriesDimension).toEqual(true);
    });

    it('should call the refresh callback when loading new indexpatterns', async () => {
      const onIndexPatternRefresh = jest.fn();
      await loadIndexPatterns({
        cache: {
          '2': sampleIndexPatterns['2'],
        },
        patterns: ['1', '2'],
        dataViews: mockDataViewsService(),
        onIndexPatternRefresh,
      });

      expect(onIndexPatternRefresh).toHaveBeenCalled();
    });

    it('should not call the refresh callback when using the cache', async () => {
      const onIndexPatternRefresh = jest.fn();
      await loadIndexPatterns({
        cache: sampleIndexPatterns,
        patterns: ['1', '2'],
        dataViews: mockDataViewsService(),
        onIndexPatternRefresh,
      });

      expect(onIndexPatternRefresh).not.toHaveBeenCalled();
    });

    it('should load one of the not used indexpatterns if all used ones are not available', async () => {
      const dataViewsService = {
        get: jest.fn(async (id: string) => {
          if (id === '3') {
            return {
              id: '3',
              title: 'my-fake-index-pattern',
              timeFieldName: 'timestamp',
              hasRestrictions: false,
              fields: [],
              isPersisted: () => true,
              toSpec: () => ({}),
            };
          }
          return Promise.reject();
        }),
        getIdsWithTitle: jest.fn(),
        clearInstanceCache: jest.fn(),
      } as unknown as Pick<
        DataViewsContract,
        'get' | 'getIdsWithTitle' | 'create' | 'clearInstanceCache'
      >;
      const cache = await loadIndexPatterns({
        cache: {},
        patterns: ['1', '2'],
        notUsedPatterns: ['11', '3', '4', '5', '6', '7', '8', '9', '10'],
        dataViews: dataViewsService,
      });

      expect(cache).toEqual({
        3: expect.objectContaining({
          id: '3',
          title: 'my-fake-index-pattern',
          timeFieldName: 'timestamp',
          hasRestrictions: false,
          fields: [documentField],
        }),
      });
      // trying to load the used patterns 1 and 2, then trying the not used pattern 11 and succeeding with the pattern 3 - 4 loads
      expect(dataViewsService.get).toHaveBeenCalledTimes(4);
    });
  });

  describe('ensureIndexPattern', () => {
    it('should throw if the requested indexPattern cannot be loaded', async () => {
      const err = Error('NOPE!');
      const onError = jest.fn();
      const cache = await ensureIndexPattern({
        id: '3',
        dataViews: {
          get: jest.fn(async () => {
            throw err;
          }),
          getIdsWithTitle: jest.fn(),
          clearInstanceCache: jest.fn(),
        } as unknown as Pick<
          DataViewsContract,
          'get' | 'getIdsWithTitle' | 'create' | 'clearInstanceCache'
        >,
        onError,
      });

      expect(cache).toBeUndefined();
      expect(onError).toHaveBeenCalledWith(Error('Missing indexpatterns'));
    });

    it('should ensure the requested indexpattern is loaded into the cache', async () => {
      const onError = jest.fn();
      const cache = await ensureIndexPattern({
        id: '2',
        dataViews: mockDataViewsService(),
        onError,
      });
      expect(cache).toEqual({ 2: expect.anything() });
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('buildIndexPatternField', () => {
    it('should return a field with the correct name and derived parameters', async () => {
      const field = buildIndexPatternField({
        name: 'foo',
        displayName: 'Foo',
        type: 'string',
        aggregatable: true,
        searchable: true,
      } as DataViewField);
      expect(field.name).toEqual('foo');
      expect(field.meta).toEqual(false);
      expect(field.runtime).toEqual(false);
    });
    it('should return return the right meta field value', async () => {
      const field = buildIndexPatternField(
        {
          name: 'meta',
          displayName: 'Meta',
          type: 'string',
          aggregatable: true,
          searchable: true,
        } as DataViewField,
        new Set(['meta'])
      );
      expect(field.meta).toEqual(true);
    });
  });

  describe('resolveEsqlTimeFields', () => {
    it('should resolve and enrich time field for ESQL ad-hoc data views missing one', async () => {
      const esqlSpecId = 'esql-logs-no_time_field';

      const createMock = jest.fn(async (spec) => ({
        id: spec.id,
        title: spec.title,
        type: spec.type,
        timeFieldName: spec.timeFieldName,
        fields: [],
        metaFields: [],
        isPersisted: () => false,
        toSpec: () => spec,
      }));

      const httpMock = {
        get: jest.fn(async () => {
          return { timeField: '@timestamp' };
        }),
      } as unknown as HttpStart;

      const clearInstanceCacheMock = jest.fn();

      const dataViewsService = {
        get: jest.fn(async () => Promise.reject()),
        getIdsWithTitle: jest.fn(async () => []),
        create: createMock,
        clearInstanceCache: clearInstanceCacheMock,
      } as unknown as Pick<
        DataViewsContract,
        'get' | 'getIdsWithTitle' | 'create' | 'clearInstanceCache'
      >;

      const cache = await loadIndexPatterns({
        cache: {},
        patterns: [],
        dataViews: dataViewsService,
        adHocDataViews: {
          [esqlSpecId]: {
            id: esqlSpecId,
            title: 'logs-*',
            type: 'esql',
          },
        },
        http: httpMock,
      });

      expect(httpMock.get).toHaveBeenCalledWith(
        `${TIMEFIELD_ROUTE}${encodeURIComponent('FROM logs-*')}`
      );
      expect(clearInstanceCacheMock).toHaveBeenCalledWith(esqlSpecId);
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: esqlSpecId,
          title: 'logs-*',
          type: 'esql',
          timeFieldName: '@timestamp',
        })
      );
      expect(cache[esqlSpecId].timeFieldName).toEqual('@timestamp');
    });

    it('should not enrich time field for ESQL ad-hoc data views that already have one', async () => {
      const esqlSpecId = 'esql-logs-custom_time';

      const createMock = jest.fn(async (spec) => ({
        id: spec.id,
        title: spec.title,
        type: spec.type,
        timeFieldName: spec.timeFieldName,
        fields: [],
        metaFields: [],
        isPersisted: () => false,
        toSpec: () => spec,
      }));

      const httpMock = {
        get: jest.fn(),
      } as unknown as HttpStart;

      const clearInstanceCacheMock = jest.fn();

      const dataViewsService = {
        get: jest.fn(async () => Promise.reject()),
        getIdsWithTitle: jest.fn(async () => []),
        create: createMock,
        clearInstanceCache: clearInstanceCacheMock,
      } as unknown as Pick<
        DataViewsContract,
        'get' | 'getIdsWithTitle' | 'create' | 'clearInstanceCache'
      >;

      const cache = await loadIndexPatterns({
        cache: {},
        patterns: [],
        dataViews: dataViewsService,
        adHocDataViews: {
          [esqlSpecId]: {
            id: esqlSpecId,
            title: 'logs-*',
            name: 'logs-*',
            type: 'esql',
            timeFieldName: 'event.created',
          },
        },
        http: httpMock,
      });

      expect(httpMock.get).not.toHaveBeenCalled();
      expect(clearInstanceCacheMock).not.toHaveBeenCalled();
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({ timeFieldName: 'event.created' })
      );
      expect(cache[esqlSpecId].timeFieldName).toEqual('event.created');
    });
  });
});
