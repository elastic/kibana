/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash/fp';

import { mockIndexPattern } from '../../mock';

import { mockDataProviders } from './data_providers/mock/mock_data_providers';
import { buildGlobalQuery, combineQueries } from './helpers';
import { mockBrowserFields } from '../../containers/source/mock';

const cleanUpKqlQuery = (str: string) => str.replace(/\n/g, '').replace(/\s\s+/g, ' ');
const startDate = new Date('2018-03-23T18:49:23.132Z').valueOf();
const endDate = new Date('2018-03-24T03:33:52.253Z').valueOf();

describe('Build KQL Query', () => {
  test('Build KQL query with one data provider', () => {
    const dataProviders = mockDataProviders.slice(0, 1);
    const kqlQuery = buildGlobalQuery(dataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual('( name : Provider 1 )');
  });

  test('Build KQL query with one data provider as timestamp (string input)', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    dataProviders[0].queryMatch.field = '@timestamp';
    dataProviders[0].queryMatch.value = '2018-03-23T23:36:23.232Z';
    const kqlQuery = buildGlobalQuery(dataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual('( @timestamp: 1521848183232 )');
  });

  test('Buld KQL query with one data provider as timestamp (numeric input)', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    dataProviders[0].queryMatch.field = '@timestamp';
    dataProviders[0].queryMatch.value = 1521848183232;
    const kqlQuery = buildGlobalQuery(dataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual('( @timestamp: 1521848183232 )');
  });

  test('Build KQL query with one data provider as date type (string input)', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    dataProviders[0].queryMatch.field = 'event.end';
    dataProviders[0].queryMatch.value = '2018-03-23T23:36:23.232Z';
    const kqlQuery = buildGlobalQuery(dataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual('( event.end: 1521848183232 )');
  });

  test('Buld KQL query with one data provider as date type (numeric input)', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    dataProviders[0].queryMatch.field = 'event.end';
    dataProviders[0].queryMatch.value = 1521848183232;
    const kqlQuery = buildGlobalQuery(dataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual('( event.end: 1521848183232 )');
  });

  test('Build KQL query with two data provider', () => {
    const dataProviders = mockDataProviders.slice(0, 2);
    const kqlQuery = buildGlobalQuery(dataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual('( name : Provider 1 ) or ( name : Provider 2 )');
  });

  test('Build KQL query with one data provider and one and', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    dataProviders[0].and = mockDataProviders.slice(1, 2);
    const kqlQuery = buildGlobalQuery(dataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual('( name : Provider 1 and name : Provider 2)');
  });

  test('Build KQL query with one data provider and one and as timestamp (string input)', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    dataProviders[0].and = cloneDeep(mockDataProviders.slice(1, 2));
    dataProviders[0].and[0].queryMatch.field = '@timestamp';
    dataProviders[0].and[0].queryMatch.value = '2018-03-23T23:36:23.232Z';
    const kqlQuery = buildGlobalQuery(dataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual('( name : Provider 1 and @timestamp: 1521848183232)');
  });

  test('Build KQL query with one data provider and one and as timestamp (numeric input)', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    dataProviders[0].and = cloneDeep(mockDataProviders.slice(1, 2));
    dataProviders[0].and[0].queryMatch.field = '@timestamp';
    dataProviders[0].and[0].queryMatch.value = 1521848183232;
    const kqlQuery = buildGlobalQuery(dataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual('( name : Provider 1 and @timestamp: 1521848183232)');
  });

  test('Build KQL query with one data provider and one and as date type (string input)', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    dataProviders[0].and = cloneDeep(mockDataProviders.slice(1, 2));
    dataProviders[0].and[0].queryMatch.field = 'event.end';
    dataProviders[0].and[0].queryMatch.value = '2018-03-23T23:36:23.232Z';
    const kqlQuery = buildGlobalQuery(dataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual('( name : Provider 1 and event.end: 1521848183232)');
  });

  test('Build KQL query with one data provider and one and as date type (numeric input)', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    dataProviders[0].and = cloneDeep(mockDataProviders.slice(1, 2));
    dataProviders[0].and[0].queryMatch.field = 'event.end';
    dataProviders[0].and[0].queryMatch.value = 1521848183232;
    const kqlQuery = buildGlobalQuery(dataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual('( name : Provider 1 and event.end: 1521848183232)');
  });

  test('Build KQL query with two data provider and multiple and', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 2));
    dataProviders[0].and = mockDataProviders.slice(2, 4);
    dataProviders[1].and = mockDataProviders.slice(4, 5);
    const kqlQuery = buildGlobalQuery(dataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual(
      '( name : Provider 1 and name : Provider 3 and name : Provider 4) or ( name : Provider 2 and name : Provider 5)'
    );
  });
});

describe('Combined Queries', () => {
  test('No Data Provider & No kqlQuery', () => {
    expect(
      combineQueries([], mockIndexPattern, mockBrowserFields, '', 'search', startDate, endDate)
    ).toBeNull();
  });

  test('Only Data Provider', () => {
    const dataProviders = mockDataProviders.slice(0, 1);
    const { filterQuery } = combineQueries(
      dataProviders,
      mockIndexPattern,
      mockBrowserFields,
      '',
      'search',
      startDate,
      endDate
    )!;
    expect(filterQuery).toEqual(
      '{"bool":{"filter":[{"bool":{"should":[{"match":{"name":"Provider 1"}}],"minimum_should_match":1}},{"bool":{"filter":[{"bool":{"should":[{"range":{"@timestamp":{"gte":1521830963132}}}],"minimum_should_match":1}},{"bool":{"should":[{"range":{"@timestamp":{"lte":1521862432253}}}],"minimum_should_match":1}}]}}]}}'
    );
  });

  test('Only Data Provider with timestamp (string input)', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    dataProviders[0].queryMatch.field = '@timestamp';
    dataProviders[0].queryMatch.value = '2018-03-23T23:36:23.232Z';
    const { filterQuery } = combineQueries(
      dataProviders,
      mockIndexPattern,
      mockBrowserFields,
      '',
      'search',
      startDate,
      endDate
    )!;
    expect(filterQuery).toEqual(
      '{"bool":{"filter":[{"bool":{"should":[{"range":{"@timestamp":{"gte":1521848183232,"lte":1521848183232}}}],"minimum_should_match":1}},{"bool":{"filter":[{"bool":{"should":[{"range":{"@timestamp":{"gte":1521830963132}}}],"minimum_should_match":1}},{"bool":{"should":[{"range":{"@timestamp":{"lte":1521862432253}}}],"minimum_should_match":1}}]}}]}}'
    );
  });

  test('Only Data Provider with timestamp (numeric input)', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    dataProviders[0].queryMatch.field = '@timestamp';
    dataProviders[0].queryMatch.value = 1521848183232;
    const { filterQuery } = combineQueries(
      dataProviders,
      mockIndexPattern,
      mockBrowserFields,
      '',
      'search',
      startDate,
      endDate
    )!;
    expect(filterQuery).toEqual(
      '{"bool":{"filter":[{"bool":{"should":[{"range":{"@timestamp":{"gte":1521848183232,"lte":1521848183232}}}],"minimum_should_match":1}},{"bool":{"filter":[{"bool":{"should":[{"range":{"@timestamp":{"gte":1521830963132}}}],"minimum_should_match":1}},{"bool":{"should":[{"range":{"@timestamp":{"lte":1521862432253}}}],"minimum_should_match":1}}]}}]}}'
    );
  });

  test('Only Data Provider with a date type (string input)', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    dataProviders[0].queryMatch.field = 'event.end';
    dataProviders[0].queryMatch.value = '2018-03-23T23:36:23.232Z';
    const { filterQuery } = combineQueries(
      dataProviders,
      mockIndexPattern,
      mockBrowserFields,
      '',
      'search',
      startDate,
      endDate
    )!;
    expect(filterQuery).toEqual(
      '{"bool":{"filter":[{"bool":{"should":[{"match":{"event.end":1521848183232}}],"minimum_should_match":1}},{"bool":{"filter":[{"bool":{"should":[{"range":{"@timestamp":{"gte":1521830963132}}}],"minimum_should_match":1}},{"bool":{"should":[{"range":{"@timestamp":{"lte":1521862432253}}}],"minimum_should_match":1}}]}}]}}'
    );
  });

  test('Only Data Provider with date type (numeric input)', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    dataProviders[0].queryMatch.field = 'event.end';
    dataProviders[0].queryMatch.value = 1521848183232;
    const { filterQuery } = combineQueries(
      dataProviders,
      mockIndexPattern,
      mockBrowserFields,
      '',
      'search',
      startDate,
      endDate
    )!;
    expect(filterQuery).toEqual(
      '{"bool":{"filter":[{"bool":{"should":[{"match":{"event.end":1521848183232}}],"minimum_should_match":1}},{"bool":{"filter":[{"bool":{"should":[{"range":{"@timestamp":{"gte":1521830963132}}}],"minimum_should_match":1}},{"bool":{"should":[{"range":{"@timestamp":{"lte":1521862432253}}}],"minimum_should_match":1}}]}}]}}'
    );
  });

  test('Only KQL search/filter query', () => {
    const { filterQuery } = combineQueries(
      [],
      mockIndexPattern,
      mockBrowserFields,
      'host.name: "host-1"',
      'search',
      startDate,
      endDate
    )!;
    expect(filterQuery).toEqual(
      '{"bool":{"filter":[{"bool":{"should":[{"match_phrase":{"host.name":"host-1"}}],"minimum_should_match":1}},{"bool":{"filter":[{"bool":{"should":[{"range":{"@timestamp":{"gte":1521830963132}}}],"minimum_should_match":1}},{"bool":{"should":[{"range":{"@timestamp":{"lte":1521862432253}}}],"minimum_should_match":1}}]}}]}}'
    );
  });

  test('Data Provider & KQL search query', () => {
    const dataProviders = mockDataProviders.slice(0, 1);
    const { filterQuery } = combineQueries(
      dataProviders,
      mockIndexPattern,
      mockBrowserFields,
      'host.name: "host-1"',
      'search',
      startDate,
      endDate
    )!;
    expect(filterQuery).toEqual(
      '{"bool":{"filter":[{"bool":{"should":[{"bool":{"should":[{"match":{"name":"Provider 1"}}],"minimum_should_match":1}},{"bool":{"should":[{"match_phrase":{"host.name":"host-1"}}],"minimum_should_match":1}}],"minimum_should_match":1}},{"bool":{"filter":[{"bool":{"should":[{"range":{"@timestamp":{"gte":1521830963132}}}],"minimum_should_match":1}},{"bool":{"should":[{"range":{"@timestamp":{"lte":1521862432253}}}],"minimum_should_match":1}}]}}]}}'
    );
  });

  test('Data Provider & KQL filter query', () => {
    const dataProviders = mockDataProviders.slice(0, 1);
    const { filterQuery } = combineQueries(
      dataProviders,
      mockIndexPattern,
      mockBrowserFields,
      'host.name: "host-1"',
      'filter',
      startDate,
      endDate
    )!;
    expect(filterQuery).toEqual(
      '{"bool":{"filter":[{"bool":{"filter":[{"bool":{"should":[{"match":{"name":"Provider 1"}}],"minimum_should_match":1}},{"bool":{"should":[{"match_phrase":{"host.name":"host-1"}}],"minimum_should_match":1}}]}},{"bool":{"filter":[{"bool":{"should":[{"range":{"@timestamp":{"gte":1521830963132}}}],"minimum_should_match":1}},{"bool":{"should":[{"range":{"@timestamp":{"lte":1521862432253}}}],"minimum_should_match":1}}]}}]}}'
    );
  });
});
