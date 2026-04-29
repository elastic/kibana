/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { httpServiceMock } from '@kbn/core/public/mocks';
import { loadRulesWithKueryFilter } from './rules_kuery_filter';

const http = httpServiceMock.createStartContract();

describe('loadRulesWithKueryFilter', () => {
  beforeEach(() => jest.resetAllMocks());

  test('should call find API with base parameters', async () => {
    const resolvedValue = {
      page: 1,
      per_page: 10,
      total: 0,
      data: [],
    };
    http.post.mockResolvedValueOnce(resolvedValue);

    const result = await loadRulesWithKueryFilter({ http, page: { index: 0, size: 10 } });
    expect(result).toEqual({
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    });
    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_find",
        Object {
          "body": "{\\"page\\":1,\\"per_page\\":10,\\"sort_field\\":\\"name\\",\\"sort_order\\":\\"asc\\"}",
        },
      ]
    `);
  });

  test('should call find API with searchText', async () => {
    const resolvedValue = {
      page: 1,
      per_page: 10,
      total: 0,
      data: [],
    };
    http.post.mockResolvedValueOnce(resolvedValue);

    const result = await loadRulesWithKueryFilter({
      http,
      searchText: 'apples',
      page: { index: 0, size: 10 },
    });
    expect(result).toEqual({
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    });
    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_find",
        Object {
          "body": "{\\"page\\":1,\\"per_page\\":10,\\"filter\\":\\"{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"or\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.name\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"wildcard\\\\\\",\\\\\\"value\\\\\\":\\\\\\"apples\\\\\\"}]},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.tags\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"wildcard\\\\\\",\\\\\\"value\\\\\\":\\\\\\"apples\\\\\\"}]}]}\\",\\"sort_field\\":\\"name\\",\\"sort_order\\":\\"asc\\"}",
        },
      ]
    `);
  });

  test('should call find API with actionTypesFilter', async () => {
    const resolvedValue = {
      page: 1,
      per_page: 10,
      total: 0,
      data: [],
    };
    http.post.mockResolvedValueOnce(resolvedValue);

    const result = await loadRulesWithKueryFilter({
      http,
      searchText: 'foo',
      page: { index: 0, size: 10 },
    });
    expect(result).toEqual({
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    });
    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_find",
        Object {
          "body": "{\\"page\\":1,\\"per_page\\":10,\\"filter\\":\\"{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"or\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.name\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"wildcard\\\\\\",\\\\\\"value\\\\\\":\\\\\\"foo\\\\\\"}]},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.tags\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"wildcard\\\\\\",\\\\\\"value\\\\\\":\\\\\\"foo\\\\\\"}]}]}\\",\\"sort_field\\":\\"name\\",\\"sort_order\\":\\"asc\\"}",
        },
      ]
    `);
  });

  test('should call find API with typesFilter', async () => {
    const resolvedValue = {
      page: 1,
      per_page: 10,
      total: 0,
      data: [],
    };
    http.post.mockResolvedValueOnce(resolvedValue);

    const result = await loadRulesWithKueryFilter({
      http,
      typesFilter: ['foo', 'bar'],
      page: { index: 0, size: 10 },
    });
    expect(result).toEqual({
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    });
    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_find",
        Object {
          "body": "{\\"page\\":1,\\"per_page\\":10,\\"filter\\":\\"{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"or\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.alertTypeId\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"foo\\\\\\",\\\\\\"isQuoted\\\\\\":false}]},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.alertTypeId\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"bar\\\\\\",\\\\\\"isQuoted\\\\\\":false}]}]}\\",\\"sort_field\\":\\"name\\",\\"sort_order\\":\\"asc\\"}",
        },
      ]
    `);
  });

  test('should call find API with actionTypesFilter and typesFilter', async () => {
    const resolvedValue = {
      page: 1,
      per_page: 10,
      total: 0,
      data: [],
    };
    http.post.mockResolvedValueOnce(resolvedValue);

    const result = await loadRulesWithKueryFilter({
      http,
      searchText: 'baz',
      typesFilter: ['foo', 'bar'],
      page: { index: 0, size: 10 },
    });
    expect(result).toEqual({
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    });
    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_find",
        Object {
          "body": "{\\"page\\":1,\\"per_page\\":10,\\"filter\\":\\"{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"and\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"or\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.alertTypeId\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"foo\\\\\\",\\\\\\"isQuoted\\\\\\":false}]},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.alertTypeId\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"bar\\\\\\",\\\\\\"isQuoted\\\\\\":false}]}]},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"or\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.name\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"wildcard\\\\\\",\\\\\\"value\\\\\\":\\\\\\"baz\\\\\\"}]},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.tags\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"wildcard\\\\\\",\\\\\\"value\\\\\\":\\\\\\"baz\\\\\\"}]}]}]}\\",\\"sort_field\\":\\"name\\",\\"sort_order\\":\\"asc\\"}",
        },
      ]
    `);
  });

  test('should call find API with searchText and tagsFilter and typesFilter', async () => {
    const resolvedValue = {
      page: 1,
      per_page: 10,
      total: 0,
      data: [],
    };
    http.post.mockResolvedValueOnce(resolvedValue);

    const result = await loadRulesWithKueryFilter({
      http,
      searchText: 'apples, foo, baz',
      typesFilter: ['foo', 'bar'],
      page: { index: 0, size: 10 },
    });
    expect(result).toEqual({
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    });
    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_find",
        Object {
          "body": "{\\"page\\":1,\\"per_page\\":10,\\"filter\\":\\"{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"and\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"or\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.alertTypeId\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"foo\\\\\\",\\\\\\"isQuoted\\\\\\":false}]},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.alertTypeId\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"bar\\\\\\",\\\\\\"isQuoted\\\\\\":false}]}]},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"or\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.name\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"wildcard\\\\\\",\\\\\\"value\\\\\\":\\\\\\"apples, foo, baz\\\\\\"}]},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.tags\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"wildcard\\\\\\",\\\\\\"value\\\\\\":\\\\\\"apples, foo, baz\\\\\\"}]}]}]}\\",\\"sort_field\\":\\"name\\",\\"sort_order\\":\\"asc\\"}",
        },
      ]
    `);
  });

  test('should call find API with searchText and tagsFilter and ruleTypeIds and consumers', async () => {
    const resolvedValue = {
      page: 1,
      per_page: 10,
      total: 0,
      data: [],
    };
    http.post.mockResolvedValueOnce(resolvedValue);

    const result = await loadRulesWithKueryFilter({
      http,
      searchText: 'apples, foo, baz',
      typesFilter: ['foo', 'bar'],
      ruleTypeIds: ['one', 'two'],
      consumers: ['my-consumer'],
      page: { index: 0, size: 10 },
    });
    expect(result).toEqual({
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    });
    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_find",
        Object {
          "body": "{\\"page\\":1,\\"per_page\\":10,\\"filter\\":\\"{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"and\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"or\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.alertTypeId\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"foo\\\\\\",\\\\\\"isQuoted\\\\\\":false}]},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.alertTypeId\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"bar\\\\\\",\\\\\\"isQuoted\\\\\\":false}]}]},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"or\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.name\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"wildcard\\\\\\",\\\\\\"value\\\\\\":\\\\\\"apples, foo, baz\\\\\\"}]},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.tags\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"wildcard\\\\\\",\\\\\\"value\\\\\\":\\\\\\"apples, foo, baz\\\\\\"}]}]}]}\\",\\"sort_field\\":\\"name\\",\\"sort_order\\":\\"asc\\",\\"rule_type_ids\\":[\\"one\\",\\"two\\"],\\"consumers\\":[\\"my-consumer\\"]}",
        },
      ]
    `);
  });

  test('should call find API with ruleStatusesFilter', async () => {
    const resolvedValue = {
      page: 1,
      per_page: 10,
      total: 0,
      data: [],
    };
    http.post.mockResolvedValue(resolvedValue);

    let result = await loadRulesWithKueryFilter({
      http,
      ruleStatusesFilter: ['enabled', 'snoozed'],
      page: { index: 0, size: 10 },
    });
    expect(result).toEqual({
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    });
    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_find",
        Object {
          "body": "{\\"page\\":1,\\"per_page\\":10,\\"filter\\":\\"{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"or\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.enabled\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":true,\\\\\\"isQuoted\\\\\\":false}]},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"or\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.muteAll\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":true,\\\\\\"isQuoted\\\\\\":false}]},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"nested\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.snoozeSchedule\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"range\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"duration\\\\\\",\\\\\\"isQuoted\\\\\\":false},\\\\\\"gt\\\\\\",{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"0\\\\\\",\\\\\\"isQuoted\\\\\\":false}]}]}]}]}\\",\\"sort_field\\":\\"name\\",\\"sort_order\\":\\"asc\\"}",
        },
      ]
    `);

    result = await loadRulesWithKueryFilter({
      http,
      ruleStatusesFilter: ['disabled'],
      page: { index: 0, size: 10 },
    });
    expect(result).toEqual({
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    });
    expect(http.post.mock.calls[1]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_find",
        Object {
          "body": "{\\"page\\":1,\\"per_page\\":10,\\"filter\\":\\"{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.enabled\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":false,\\\\\\"isQuoted\\\\\\":false}]}\\",\\"sort_field\\":\\"name\\",\\"sort_order\\":\\"asc\\"}",
        },
      ]
    `);

    result = await loadRulesWithKueryFilter({
      http,
      ruleStatusesFilter: ['enabled', 'disabled', 'snoozed'],
      page: { index: 0, size: 10 },
    });
    expect(result).toEqual({
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    });
    expect(http.post.mock.calls[2]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_find",
        Object {
          "body": "{\\"page\\":1,\\"per_page\\":10,\\"filter\\":\\"{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"or\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.enabled\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":true,\\\\\\"isQuoted\\\\\\":false}]},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.enabled\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":false,\\\\\\"isQuoted\\\\\\":false}]},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"or\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.muteAll\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":true,\\\\\\"isQuoted\\\\\\":false}]},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"nested\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.snoozeSchedule\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"range\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"duration\\\\\\",\\\\\\"isQuoted\\\\\\":false},\\\\\\"gt\\\\\\",{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"0\\\\\\",\\\\\\"isQuoted\\\\\\":false}]}]}]}]}\\",\\"sort_field\\":\\"name\\",\\"sort_order\\":\\"asc\\"}",
        },
      ]
    `);
  });

  test('should call find API with tagsFilter', async () => {
    const resolvedValue = {
      page: 1,
      per_page: 10,
      total: 0,
      data: [],
    };
    http.post.mockResolvedValueOnce(resolvedValue);
    const result = await loadRulesWithKueryFilter({
      http,
      tagsFilter: ['a', 'b', 'c'],
      page: { index: 0, size: 10 },
    });
    expect(result).toEqual({
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    });
    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_find",
        Object {
          "body": "{\\"page\\":1,\\"per_page\\":10,\\"filter\\":\\"{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"or\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.tags\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"a\\\\\\",\\\\\\"isQuoted\\\\\\":false}]},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.tags\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"b\\\\\\",\\\\\\"isQuoted\\\\\\":false}]},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.tags\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"c\\\\\\",\\\\\\"isQuoted\\\\\\":false}]}]}\\",\\"sort_field\\":\\"name\\",\\"sort_order\\":\\"asc\\"}",
        },
      ]
    `);
  });

  test('should call find API with ruleTypeIds', async () => {
    const resolvedValue = {
      page: 1,
      per_page: 10,
      total: 0,
      data: [],
    };
    http.post.mockResolvedValueOnce(resolvedValue);

    const result = await loadRulesWithKueryFilter({
      http,
      ruleTypeIds: ['foo', 'bar'],
      page: { index: 0, size: 10 },
    });
    expect(result).toEqual({
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    });
    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_find",
        Object {
          "body": "{\\"page\\":1,\\"per_page\\":10,\\"sort_field\\":\\"name\\",\\"sort_order\\":\\"asc\\",\\"rule_type_ids\\":[\\"foo\\",\\"bar\\"]}",
        },
      ]
    `);
  });

  test('should call find API with consumers', async () => {
    const resolvedValue = {
      page: 1,
      per_page: 10,
      total: 0,
      data: [],
    };
    http.post.mockResolvedValueOnce(resolvedValue);

    const result = await loadRulesWithKueryFilter({
      http,
      consumers: ['foo', 'bar'],
      page: { index: 0, size: 10 },
    });
    expect(result).toEqual({
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    });
    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_find",
        Object {
          "body": "{\\"page\\":1,\\"per_page\\":10,\\"sort_field\\":\\"name\\",\\"sort_order\\":\\"asc\\",\\"consumers\\":[\\"foo\\",\\"bar\\"]}",
        },
      ]
    `);
  });
});
