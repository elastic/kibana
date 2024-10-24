/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encodeQueryUrl, composeQueryFilters } from './query_utils';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';

const DEFAULT_DATA_VIEW_ID = 'security-solution-default';

describe('composeQueryFilters', () => {
  it('Should return correct filters given some filterParams', () => {
    const testFilterParams = {
      test_field: 'test_value',
    };
    const testResult = [
      {
        meta: {
          alias: null,
          negate: false,
          disabled: false,
          type: 'phrase',
          key: 'test_field',
          index: DEFAULT_DATA_VIEW_ID,
        },
        query: { match_phrase: { test_field: 'test_value' } },
      },
    ];
    expect(composeQueryFilters(testFilterParams)).toEqual(testResult);
  });

  it('Should return empty filters given empty filterParams', () => {
    expect(composeQueryFilters({})).toEqual([]);
  });

  it('Should return correct filters given some filterParams and dataviewId', () => {
    const testFilterParams = {
      test_field: 'test_value',
    };
    const testResult = [
      {
        meta: {
          alias: null,
          negate: false,
          disabled: false,
          type: 'phrase',
          key: 'test_field',
          index: 'test-data-view',
        },
        query: { match_phrase: { test_field: 'test_value' } },
      },
    ];
    expect(composeQueryFilters(testFilterParams, 'test-data-view')).toEqual(testResult);
  });
});

describe('encodeQueryUrl', () => {
  const getServicesMock = () => ({
    data: dataPluginMock.createStartContract(),
  });

  it('Should return correct URL given empty filters', () => {
    const result = 'cspq=(filters:!())';
    expect(encodeQueryUrl(getServicesMock().data, [])).toEqual(result);
  });

  it('should return correct URL given filters', () => {
    const filter = [
      {
        meta: {
          alias: null,
          negate: false,
          disabled: false,
          type: 'phrase',
          key: 'test_field',
          index: DEFAULT_DATA_VIEW_ID,
        },
        query: { match_phrase: { test_field: 'test_value' } },
      },
    ];
    const result =
      'cspq=(filters:!((meta:(alias:!n,disabled:!f,index:security-solution-default,key:test_field,negate:!f,type:phrase),query:(match_phrase:(test_field:test_value)))))';
    expect(encodeQueryUrl(getServicesMock().data, filter)).toEqual(result);
  });

  it('should return correct URL given filters and group by', () => {
    const filter = [
      {
        meta: {
          alias: null,
          negate: false,
          disabled: false,
          type: 'phrase',
          key: 'test_field',
          index: DEFAULT_DATA_VIEW_ID,
        },
        query: { match_phrase: { test_field: 'test_value' } },
      },
    ];
    const groupByFilter = ['filterA'];
    const result =
      'cspq=(filters:!((meta:(alias:!n,disabled:!f,index:security-solution-default,key:test_field,negate:!f,type:phrase),query:(match_phrase:(test_field:test_value)))),groupBy:!(filterA))';
    expect(encodeQueryUrl(getServicesMock().data, filter, groupByFilter)).toEqual(result);
  });
});
