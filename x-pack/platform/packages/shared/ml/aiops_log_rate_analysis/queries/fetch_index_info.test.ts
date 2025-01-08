/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { ElasticsearchClient } from '@kbn/core/server';

import { paramsSearchQueryMock } from './__mocks__/params_search_query';
import { fieldCapsPgBenchMock } from './__mocks__/field_caps_pgbench';
import { fieldCapsEcommerceMock } from './__mocks__/field_caps_ecommerce';
import { fieldCapsLargeArraysMock } from './__mocks__/field_caps_large_arrays';

import { fetchIndexInfo } from './fetch_index_info';

describe('fetchIndexInfo', () => {
  it('returns field candidates and total hits for "my" fields', async () => {
    const esClientFieldCapsMock = jest.fn(() => ({
      fields: {
        // Should end up as a field candidate
        myIpFieldName: { ip: { aggregatable: true } },
        // Should end up as a field candidate
        myKeywordFieldName: { keyword: { aggregatable: true } },
        // Should not end up as a field candidate, it's a keyword but non-aggregatable
        myKeywordFieldNameToBeIgnored: { keyword: { aggregatable: false } },
        // Should not end up as a field candidate since fields of type number will not be considered
        myNumericFieldName: { number: {} },
      },
    }));
    const esClientSearchMock = jest.fn((req: estypes.SearchRequest): estypes.SearchResponse => {
      return {
        hits: {
          hits: [],
          total: { value: 5000000 },
        },
      } as unknown as estypes.SearchResponse;
    });

    const esClientMock = {
      fieldCaps: esClientFieldCapsMock,
      search: esClientSearchMock,
    } as unknown as ElasticsearchClient;

    const { baselineTotalDocCount, deviationTotalDocCount, keywordFieldCandidates } =
      await fetchIndexInfo({
        esClient: esClientMock,
        arguments: { ...paramsSearchQueryMock, textFieldCandidatesOverrides: [] },
      });

    expect(keywordFieldCandidates).toEqual(['myIpFieldName', 'myKeywordFieldName']);
    expect(baselineTotalDocCount).toEqual(5000000);
    expect(deviationTotalDocCount).toEqual(5000000);
    expect(esClientFieldCapsMock).toHaveBeenCalledTimes(1);
    expect(esClientSearchMock).toHaveBeenCalledTimes(2);
  });

  it('returns field candidates and total hits for pgBench mappings', async () => {
    const esClientFieldCapsMock = jest.fn(() => fieldCapsPgBenchMock);
    const esClientSearchMock = jest.fn((req: estypes.SearchRequest): estypes.SearchResponse => {
      return {
        hits: {
          hits: [],
          total: { value: 5000000 },
        },
      } as unknown as estypes.SearchResponse;
    });

    const esClientMock = {
      fieldCaps: esClientFieldCapsMock,
      search: esClientSearchMock,
    } as unknown as ElasticsearchClient;

    const {
      baselineTotalDocCount,
      deviationTotalDocCount,
      keywordFieldCandidates,
      textFieldCandidates,
    } = await fetchIndexInfo({
      esClient: esClientMock,
      arguments: { ...paramsSearchQueryMock, textFieldCandidatesOverrides: [] },
    });

    expect(keywordFieldCandidates).toEqual([
      'agent.name',
      'agent.type',
      'agent.version',
      'client.geo.city_name',
      'client.geo.continent_name',
      'client.geo.country_name',
      'client.geo.region_name',
      'client.ip',
      'cloud.account.id',
      'cloud.availability_zone',
      'cloud.instance.id',
      'cloud.machine.type',
      'cloud.project.id',
      'cloud.provider',
      'cloud.service.name',
      'container.id',
      'container.image.name',
      'container.name',
      'container.runtime',
      'data_stream.dataset',
      'data_stream.namespace',
      'data_stream.type',
      'ecs.version',
      'event.category',
      'event.dataset',
      'event.kind',
      'event.module',
      'event.timezone',
      'event.type',
      'host.architecture',
      'host.ip',
      'host.name',
      'host.os.family',
      'host.os.kernel',
      'host.os.name',
      'host.os.platform',
      'host.os.version',
      'log.file.path',
      'log.level',
      'log.logger',
      'log.origin.file.name',
      'log.origin.function',
      'process.name',
      'service.name',
      'service.type',
      'user.name',
    ]);
    expect(textFieldCandidates).toEqual(['error.message', 'message']);
    expect(baselineTotalDocCount).toEqual(5000000);
    expect(deviationTotalDocCount).toEqual(5000000);
    expect(esClientFieldCapsMock).toHaveBeenCalledTimes(1);
    expect(esClientSearchMock).toHaveBeenCalledTimes(2);
  });

  it('returns field candidates and total hits for ecommerce mappings', async () => {
    const esClientFieldCapsMock = jest.fn(() => fieldCapsEcommerceMock);
    const esClientSearchMock = jest.fn((req: estypes.SearchRequest): estypes.SearchResponse => {
      return {
        hits: {
          hits: [],
          total: { value: 5000000 },
        },
      } as unknown as estypes.SearchResponse;
    });

    const esClientMock = {
      fieldCaps: esClientFieldCapsMock,
      search: esClientSearchMock,
    } as unknown as ElasticsearchClient;

    const {
      baselineTotalDocCount,
      deviationTotalDocCount,
      keywordFieldCandidates,
      textFieldCandidates,
    } = await fetchIndexInfo({
      esClient: esClientMock,
      arguments: { ...paramsSearchQueryMock, textFieldCandidatesOverrides: [] },
    });

    expect(keywordFieldCandidates).toEqual([
      'category.keyword',
      'currency',
      'customer_first_name.keyword',
      'customer_full_name.keyword',
      'customer_gender',
      'customer_id',
      'customer_last_name.keyword',
      'customer_phone',
      'day_of_week',
      'email',
      'event.dataset',
      'geoip.city_name',
      'geoip.continent_name',
      'geoip.country_iso_code',
      'geoip.region_name',
      'manufacturer.keyword',
      'order_id',
      'products._id.keyword',
      'products.category.keyword',
      'products.manufacturer.keyword',
      'products.product_name.keyword',
      'products.sku',
      'sku',
      'type',
      'user',
    ]);
    expect(textFieldCandidates).toEqual([]);
    expect(baselineTotalDocCount).toEqual(5000000);
    expect(deviationTotalDocCount).toEqual(5000000);
    expect(esClientFieldCapsMock).toHaveBeenCalledTimes(1);
    expect(esClientSearchMock).toHaveBeenCalledTimes(2);
  });

  it('returns field candidates and total hits for large-arrays mappings', async () => {
    const esClientFieldCapsMock = jest.fn(() => fieldCapsLargeArraysMock);
    const esClientSearchMock = jest.fn((req: estypes.SearchRequest): estypes.SearchResponse => {
      return {
        hits: {
          hits: [],
          total: { value: 5000000 },
        },
      } as unknown as estypes.SearchResponse;
    });

    const esClientMock = {
      fieldCaps: esClientFieldCapsMock,
      search: esClientSearchMock,
    } as unknown as ElasticsearchClient;

    const {
      baselineTotalDocCount,
      deviationTotalDocCount,
      keywordFieldCandidates,
      textFieldCandidates,
    } = await fetchIndexInfo({
      esClient: esClientMock,
      arguments: { ...paramsSearchQueryMock, textFieldCandidatesOverrides: [] },
    });

    expect(keywordFieldCandidates).toEqual(['items']);
    expect(textFieldCandidates).toEqual([]);
    expect(baselineTotalDocCount).toEqual(5000000);
    expect(deviationTotalDocCount).toEqual(5000000);
    expect(esClientFieldCapsMock).toHaveBeenCalledTimes(1);
    expect(esClientSearchMock).toHaveBeenCalledTimes(2);
  });
});
