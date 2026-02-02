/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateParams } from './v1';

describe('validateParams', () => {
  describe('esqlQuery', () => {
    const params = {
      searchType: 'esqlQuery',
      threshold: [0],
      thresholdComparator: '>',
      timeField: '@timestamp',
    };

    it('if timeField is not defined should return error message', () => {
      expect(
        validateParams({
          ...params,
          timeField: undefined,
        })
      ).toBe('[timeField]: is required');
      expect(
        validateParams({
          ...params,
          timeField: '',
        })
      ).toBe('[timeField]: is required');
    });

    it('if thresholdComparator is not > should return error message', () => {
      expect(
        validateParams({
          ...params,
          thresholdComparator: '<',
        })
      ).toBe('[thresholdComparator]: is required to be greater than');
    });

    it('if threshold is not 0 should return error message', () => {
      expect(
        validateParams({
          ...params,
          threshold: [8],
        })
      ).toBe('[threshold]: is required to be 0');
    });

    it('if groupBy is "top" should not return error message', () => {
      expect(
        validateParams({
          ...params,
          groupBy: 'top',
        })
      ).toBeUndefined();
    });
  });

  const esQuery = [
    'esQuery',
    {
      aggType: 'count',
      esQuery: '{"query":{"match_all":{}}}',
      groupBy: 'all',
      searchType: 'esQuery',
      threshold: [0],
      thresholdComparator: '>',
    },
  ] as const;
  const searchSource = [
    'searchSource',
    {
      aggType: 'count',
      groupBy: 'all',
      searchType: 'searchSource',
      threshold: [0],
      thresholdComparator: '>',
    },
  ] as const;
  for (const [searchType, params] of [esQuery, searchSource]) {
    describe(searchType, () => {
      it('if thresholdComparator is a "betweenComparator" and threshold does not have two elements should return error message', () => {
        expect(
          validateParams({
            ...params,
            thresholdComparator: 'between',
          })
        ).toBe('[threshold]: must have two elements for the "between" comparator');
      });

      it('if aggType is not "count" and aggField is not defined should return error message', () => {
        expect(
          validateParams({
            ...params,
            aggType: 'avg',
            aggField: undefined,
          })
        ).toBe('[aggField]: must have a value when [aggType] is "avg"');
      });

      it('if groupBy is "top" and termField is undefined should return error message', () => {
        expect(
          validateParams({
            ...params,
            groupBy: 'top',
            termField: undefined,
          })
        ).toBe('[termField]: termField required when [groupBy] is top');
      });

      it('if groupBy is "top" and termSize is undefined should return error message', () => {
        expect(
          validateParams({
            ...params,
            groupBy: 'top',
            termField: 'test',
            termSize: undefined,
          })
        ).toBe('[termSize]: termSize required when [groupBy] is top');
      });

      it('if groupBy is "top" and termSize is > MAX_GROUPS should return error message', () => {
        expect(
          validateParams({
            ...params,
            groupBy: 'top',
            termField: 'test',
            termSize: 1001,
          })
        ).toBe('[termSize]: must be less than or equal to 1000');
      });

      it('if groupBy is "row" should return error message', () => {
        expect(
          validateParams({
            ...params,
            groupBy: 'row',
          })
        ).toBe('[groupBy]: groupBy should be all or top when [searchType] is not esqlQuery');
      });

      if (searchType === 'esQuery') {
        it('if parsed esQuery does not contain query should return error message', () => {
          expect(
            validateParams({
              ...params,
              esQuery: '{}',
            })
          ).toBe('[esQuery]: must contain "query"');
        });

        it('if esQuery is not valid JSON should return error message', () => {
          expect(
            validateParams({
              ...params,
              esQuery: '{"query":{"match_all":{}}',
            })
          ).toBe('[esQuery]: must be valid JSON');
        });
      }
    });
  }
});
