/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  ClusterClientAdapter,
  IClusterClientAdapter,
  EVENT_BUFFER_LENGTH,
  getQueryBody,
  FindEventsOptionsBySavedObjectFilter,
  AggregateEventsOptionsBySavedObjectFilter,
  AggregateEventsWithAuthFilter,
  getQueryBodyWithAuthFilter,
  Doc,
} from './cluster_client_adapter';
import { AggregateOptionsType, queryOptionsSchema } from '../event_log_client';
import { delay } from '../lib/delay';
import { pick, times } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import { fromKueryExpression } from '@kbn/es-query';
import { getEsNames } from './names';

type MockedLogger = ReturnType<(typeof loggingSystemMock)['createLogger']>;

let logger: MockedLogger;
let clusterClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
let clusterClientAdapter: IClusterClientAdapter;

beforeEach(() => {
  logger = loggingSystemMock.createLogger();
  clusterClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
  clusterClientAdapter = new ClusterClientAdapter({
    logger,
    elasticsearchClientPromise: Promise.resolve(clusterClient),
    esNames: getEsNames('kibana'),
    wait: () => Promise.resolve(true),
  });
});

describe('indexDocument', () => {
  test('should call cluster client bulk with given doc', async () => {
    clusterClientAdapter.indexDocument({ body: { message: 'foo' }, index: 'event-log' });

    await retryUntil('cluster client bulk called', () => {
      return clusterClient.bulk.mock.calls.length !== 0;
    });

    expect(clusterClient.bulk).toHaveBeenCalledWith({
      body: [{ create: {} }, { message: 'foo' }],
      index: 'kibana-event-log-ds',
    });
  });

  test('should log an error when cluster client throws an error', async () => {
    clusterClient.bulk.mockRejectedValue(new Error('expected failure'));
    clusterClientAdapter.indexDocument({ body: { message: 'foo' }, index: 'event-log' });
    await retryUntil('cluster client bulk called', () => {
      return logger.error.mock.calls.length !== 0;
    });

    const expectedMessage = `error writing bulk events: "expected failure"; docs: [{"create":{}},{"message":"foo"}]`;
    expect(logger.error).toHaveBeenCalledWith(expectedMessage);
  });
});

describe('shutdown()', () => {
  test('should work if no docs have been written', async () => {
    const result = await clusterClientAdapter.shutdown();
    expect(result).toBeFalsy();
  });

  test('should work if some docs have been written', async () => {
    clusterClientAdapter.indexDocument({ body: { message: 'foo' }, index: 'event-log' });
    const resultPromise = clusterClientAdapter.shutdown();

    await retryUntil('cluster client bulk called', () => {
      return clusterClient.bulk.mock.calls.length !== 0;
    });

    const result = await resultPromise;
    expect(result).toBeFalsy();
  });
});

describe('buffering documents', () => {
  test('should write buffered docs after timeout', async () => {
    // write EVENT_BUFFER_LENGTH - 1 docs
    for (let i = 0; i < EVENT_BUFFER_LENGTH - 1; i++) {
      clusterClientAdapter.indexDocument({ body: { message: `foo ${i}` }, index: 'event-log' });
    }

    await retryUntil('cluster client bulk called', () => {
      return clusterClient.bulk.mock.calls.length !== 0;
    });

    const expectedBody = [];
    for (let i = 0; i < EVENT_BUFFER_LENGTH - 1; i++) {
      expectedBody.push({ create: {} }, { message: `foo ${i}` });
    }

    expect(clusterClient.bulk).toHaveBeenCalledWith({
      body: expectedBody,
      index: 'kibana-event-log-ds',
    });
  });

  test('should write buffered docs after buffer exceeded', async () => {
    // write EVENT_BUFFER_LENGTH + 1 docs
    for (let i = 0; i < EVENT_BUFFER_LENGTH + 1; i++) {
      clusterClientAdapter.indexDocument({ body: { message: `foo ${i}` }, index: 'event-log' });
    }

    await retryUntil('cluster client bulk called', () => {
      return clusterClient.bulk.mock.calls.length >= 2;
    });

    const expectedBody = [];
    for (let i = 0; i < EVENT_BUFFER_LENGTH; i++) {
      expectedBody.push({ create: {} }, { message: `foo ${i}` });
    }

    expect(clusterClient.bulk).toHaveBeenNthCalledWith(1, {
      body: expectedBody,
      index: 'kibana-event-log-ds',
    });

    expect(clusterClient.bulk).toHaveBeenNthCalledWith(2, {
      body: [{ create: {} }, { message: `foo 100` }],
      index: 'kibana-event-log-ds',
    });
  });

  test('should handle lots of docs correctly with a delay in the bulk index', async () => {
    // @ts-ignore
    clusterClient.bulk.mockImplementation = async () => await delay(100);

    const docs = times(EVENT_BUFFER_LENGTH * 10, (i) => ({
      body: { message: `foo ${i}` },
      index: 'event-log',
    }));

    // write EVENT_BUFFER_LENGTH * 10 docs
    for (const doc of docs) {
      clusterClientAdapter.indexDocument(doc);
    }

    await retryUntil('cluster client bulk called', () => {
      return clusterClient.bulk.mock.calls.length >= 10;
    });

    for (let i = 0; i < 10; i++) {
      const expectedBody = [];
      for (let j = 0; j < EVENT_BUFFER_LENGTH; j++) {
        expectedBody.push({ create: {} }, { message: `foo ${i * EVENT_BUFFER_LENGTH + j}` });
      }

      expect(clusterClient.bulk).toHaveBeenNthCalledWith(i + 1, {
        index: 'kibana-event-log-ds',
        body: expectedBody,
      });
    }
  });
});

describe('doesIndexTemplateExist', () => {
  test('should call cluster with proper arguments', async () => {
    await clusterClientAdapter.doesIndexTemplateExist('foo');
    expect(clusterClient.indices.existsIndexTemplate).toHaveBeenCalledWith({
      name: 'foo',
    });
  });

  test('should return true when call cluster to index template API returns true', async () => {
    clusterClient.indices.existsTemplate.mockResponse(false);
    clusterClient.indices.existsIndexTemplate.mockResponse(true);
    await expect(clusterClientAdapter.doesIndexTemplateExist('foo')).resolves.toEqual(true);
  });

  test('should throw error when call cluster to index template API throws an error', async () => {
    clusterClient.indices.existsIndexTemplate.mockRejectedValue(new Error('Fail'));
    await expect(
      clusterClientAdapter.doesIndexTemplateExist('foo')
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"error checking existence of index template: Fail"`
    );
  });
});

describe('createIndexTemplate', () => {
  test('should call cluster with given template', async () => {
    await clusterClientAdapter.createIndexTemplate('foo', { args: true });
    expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalledWith({
      name: 'foo',
      create: true,
      body: { args: true },
    });
  });

  test(`should throw error if index template still doesn't exist after error is thrown`, async () => {
    clusterClient.indices.putIndexTemplate.mockRejectedValueOnce(new Error('Fail'));
    clusterClient.indices.existsTemplate.mockResponseOnce(false);
    clusterClient.indices.existsIndexTemplate.mockResponseOnce(false);
    await expect(
      clusterClientAdapter.createIndexTemplate('foo', { args: true })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"error creating index template: Fail"`);
  });

  test('should not throw error if index template exists after error is thrown', async () => {
    clusterClient.indices.putIndexTemplate.mockRejectedValueOnce(new Error('Fail'));
    clusterClient.indices.existsTemplate.mockResponseOnce(true);
    await clusterClientAdapter.createIndexTemplate('foo', { args: true });
  });
});

describe('updateIndexTemplate', () => {
  test('should call cluster with given template', async () => {
    clusterClient.indices.simulateTemplate.mockImplementationOnce(async () => ({
      template: {
        aliases: {
          alias_name_1: {
            is_hidden: true,
          },
          alias_name_2: {
            is_hidden: true,
          },
        },
        settings: {
          hidden: true,
          number_of_shards: 1,
          auto_expand_replicas: '0-1',
        },
        mappings: { dynamic: false, properties: { '@timestamp': { type: 'date' } } },
      },
    }));

    await clusterClientAdapter.updateIndexTemplate('foo', { args: true });

    expect(clusterClient.indices.simulateTemplate).toHaveBeenCalledWith({
      name: 'foo',
      body: { args: true },
    });
    expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalledWith({
      name: 'foo',
      body: { args: true },
    });
  });

  test(`should throw error if simulate mappings response is empty`, async () => {
    clusterClient.indices.simulateTemplate.mockImplementationOnce(async () => ({
      template: {
        aliases: {
          alias_name_1: {
            is_hidden: true,
          },
          alias_name_2: {
            is_hidden: true,
          },
        },
        settings: {
          hidden: true,
          number_of_shards: 1,
          auto_expand_replicas: '0-1',
        },
        mappings: {},
      },
    }));

    await expect(() =>
      clusterClientAdapter.updateIndexTemplate('foo', { name: 'template', args: true })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"No mappings would be generated for template, possibly due to failed/misconfigured bootstrapping"`
    );

    expect(logger.error).toHaveBeenCalledWith(
      `Error updating index template foo: No mappings would be generated for template, possibly due to failed/misconfigured bootstrapping`
    );
  });

  test(`should throw error if simulateTemplate throws error`, async () => {
    clusterClient.indices.simulateTemplate.mockImplementationOnce(() => {
      throw new Error('failed to simulate');
    });

    await expect(() =>
      clusterClientAdapter.updateIndexTemplate('foo', { name: 'template', args: true })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"failed to simulate"`);

    expect(logger.error).toHaveBeenCalledWith(
      `Error updating index template foo: failed to simulate`
    );
  });

  test(`should throw error if putIndexTemplate throws error`, async () => {
    clusterClient.indices.simulateTemplate.mockImplementationOnce(async () => ({
      template: {
        aliases: {
          alias_name_1: {
            is_hidden: true,
          },
          alias_name_2: {
            is_hidden: true,
          },
        },
        settings: {
          hidden: true,
          number_of_shards: 1,
          auto_expand_replicas: '0-1',
        },
        mappings: { dynamic: false, properties: { '@timestamp': { type: 'date' } } },
      },
    }));
    clusterClient.indices.putIndexTemplate.mockImplementationOnce(() => {
      throw new Error('failed to update index template');
    });

    await expect(() =>
      clusterClientAdapter.updateIndexTemplate('foo', { name: 'template', args: true })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"failed to update index template"`);

    expect(logger.error).toHaveBeenCalledWith(
      `Error updating index template foo: failed to update index template`
    );
  });
});

describe('getExistingLegacyIndexTemplates', () => {
  test('should call cluster with given index template pattern', async () => {
    await clusterClientAdapter.getExistingLegacyIndexTemplates('foo*');
    expect(clusterClient.indices.getTemplate).toHaveBeenCalledWith(
      {
        name: 'foo*',
      },
      { ignore: [404] }
    );
  });

  test('should return templates when found', async () => {
    const response = {
      'foo-bar-template': {
        order: 0,
        index_patterns: ['foo-bar-*'],
        settings: { index: { number_of_shards: '1' } },
        mappings: { dynamic: false, properties: {} },
        aliases: {},
      },
    };
    clusterClient.indices.getTemplate.mockResponse(response);
    await expect(clusterClientAdapter.getExistingLegacyIndexTemplates('foo*')).resolves.toEqual(
      response
    );
  });

  test('should throw error when call cluster throws an error', async () => {
    clusterClient.indices.getTemplate.mockRejectedValue(new Error('Fail'));
    await expect(
      clusterClientAdapter.getExistingLegacyIndexTemplates('foo*')
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"error getting existing legacy index templates: Fail"`
    );
  });
});

describe('setLegacyIndexTemplateToHidden', () => {
  test('should call cluster with given index template name and template', async () => {
    const currentTemplate = {
      order: 0,
      index_patterns: ['foo-bar-*'],
      settings: { index: { number_of_shards: '1' } },
      mappings: { dynamic: false, properties: {} },
      aliases: {},
    };
    await clusterClientAdapter.setLegacyIndexTemplateToHidden('foo-bar-template', currentTemplate);
    expect(clusterClient.indices.putTemplate).toHaveBeenCalledWith({
      name: 'foo-bar-template',
      body: {
        order: 0,
        index_patterns: ['foo-bar-*'],
        settings: { index: { number_of_shards: '1' }, 'index.hidden': true },
        mappings: { dynamic: false, properties: {} },
        aliases: {},
      },
    });
  });

  test('should throw error when call cluster throws an error', async () => {
    clusterClient.indices.putTemplate.mockRejectedValue(new Error('Fail'));
    await expect(
      clusterClientAdapter.setLegacyIndexTemplateToHidden('foo-bar-template', {
        aliases: {},
        index_patterns: [],
        mappings: {},
        order: 0,
        settings: {},
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"error setting existing legacy index template foo-bar-template to hidden: Fail"`
    );
  });
});

describe('getExistingIndices', () => {
  test('should call cluster with given index pattern', async () => {
    await clusterClientAdapter.getExistingIndices('foo*');
    expect(clusterClient.indices.getSettings).toHaveBeenCalledWith(
      {
        index: 'foo*',
      },
      { ignore: [404] }
    );
  });

  test('should return indices when found', async () => {
    const response = {
      'foo-bar-000001': {
        settings: {
          index: {
            number_of_shards: 1,
            uuid: 'Ure4d9edQbCMtcmyy0ObrA',
          },
        },
      },
    };
    clusterClient.indices.getSettings.mockResponse(response as estypes.IndicesGetSettingsResponse);
    await expect(clusterClientAdapter.getExistingIndices('foo*')).resolves.toEqual(response);
  });

  test('should throw error when call cluster throws an error', async () => {
    clusterClient.indices.getSettings.mockRejectedValue(new Error('Fail'));
    await expect(
      clusterClientAdapter.getExistingIndices('foo*')
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"error getting existing indices matching pattern foo*: Fail"`
    );
  });
});

describe('setIndexToHidden', () => {
  test('should call cluster with given index name', async () => {
    await clusterClientAdapter.setIndexToHidden('foo-bar-000001');
    expect(clusterClient.indices.putSettings).toHaveBeenCalledWith({
      index: 'foo-bar-000001',
      body: {
        index: {
          hidden: true,
        },
      },
    });
  });

  test('should throw error when call cluster throws an error', async () => {
    clusterClient.indices.putSettings.mockRejectedValue(new Error('Fail'));
    await expect(
      clusterClientAdapter.setIndexToHidden('foo-bar-000001')
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"error setting existing index foo-bar-000001 to hidden: Fail"`
    );
  });
});

describe('getExistingIndexAliases', () => {
  test('should call cluster with given index pattern', async () => {
    await clusterClientAdapter.getExistingIndexAliases('foo*');
    expect(clusterClient.indices.getAlias).toHaveBeenCalledWith(
      {
        index: 'foo*',
      },
      { ignore: [404] }
    );
  });

  test('should return aliases when found', async () => {
    const response = {
      'foo-bar-000001': {
        aliases: {
          'foo-bar': {
            is_write_index: true,
          },
        },
      },
    };
    clusterClient.indices.getAlias.mockResponse(response as estypes.IndicesGetAliasResponse);
    await expect(clusterClientAdapter.getExistingIndexAliases('foo*')).resolves.toEqual(response);
  });

  test('should throw error when call cluster throws an error', async () => {
    clusterClient.indices.getAlias.mockRejectedValue(new Error('Fail'));
    await expect(
      clusterClientAdapter.getExistingIndexAliases('foo*')
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"error getting existing index aliases matching pattern foo*: Fail"`
    );
  });
});

describe('setIndexAliasToHidden', () => {
  test('should call cluster with given index name and aliases', async () => {
    await clusterClientAdapter.setIndexAliasToHidden('foo-bar', [
      { alias: 'foo-bar', indexName: 'foo-bar-000001', is_write_index: true },
    ]);
    expect(clusterClient.indices.updateAliases).toHaveBeenCalledWith({
      body: {
        actions: [
          {
            add: {
              index: 'foo-bar-000001',
              alias: 'foo-bar',
              is_hidden: true,
              is_write_index: true,
            },
          },
        ],
      },
    });
  });

  test('should update multiple indices for an alias at once and preserve existing alias settings', async () => {
    await clusterClientAdapter.setIndexAliasToHidden('foo-bar', [
      { alias: 'foo-bar', indexName: 'foo-bar-000001', is_write_index: true },
      { alias: 'foo-bar', indexName: 'foo-bar-000002', index_routing: 'index', routing: 'route' },
    ]);
    expect(clusterClient.indices.updateAliases).toHaveBeenCalledWith({
      body: {
        actions: [
          {
            add: {
              index: 'foo-bar-000001',
              alias: 'foo-bar',
              is_hidden: true,
              is_write_index: true,
            },
          },
          {
            add: {
              index: 'foo-bar-000002',
              alias: 'foo-bar',
              is_hidden: true,
              index_routing: 'index',
              routing: 'route',
            },
          },
        ],
      },
    });
  });

  test('should throw error when call cluster throws an error', async () => {
    clusterClient.indices.updateAliases.mockRejectedValue(new Error('Fail'));
    await expect(
      clusterClientAdapter.setIndexAliasToHidden('foo-bar', [
        { alias: 'foo-bar', indexName: 'foo-bar-000001', is_write_index: true },
      ])
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"error setting existing index aliases for alias foo-bar to is_hidden: Fail"`
    );
  });
});

export const GetDataStreamsResponse: estypes.IndicesGetDataStreamResponse = {
  data_streams: [
    {
      name: 'foo',
      timestamp_field: { name: '@timestamp' },
      status: 'GREEN' as estypes.HealthStatus,
      generation: 0,
      indices: [],
      template: '',
      hidden: true,
      prefer_ilm: false,
      rollover_on_write: true,
      next_generation_managed_by: 'Index Lifecycle Management',
    },
  ],
};

describe('doesDataStreamExist', () => {
  test('should call cluster with proper arguments', async () => {
    clusterClient.indices.getDataStream.mockResponse(GetDataStreamsResponse);
    await clusterClientAdapter.doesDataStreamExist('foo');

    expect(clusterClient.indices.getDataStream).toHaveBeenCalledWith({
      name: 'foo',
      expand_wildcards: 'all',
    });
  });

  test('should return true when call cluster returns true', async () => {
    clusterClient.indices.getDataStream.mockResponse(GetDataStreamsResponse);
    await expect(clusterClientAdapter.doesDataStreamExist('foo')).resolves.toEqual(true);
  });

  test('should return false when call cluster returns false', async () => {
    clusterClient.indices.getDataStream.mockResponse({ data_streams: [] });
    await expect(clusterClientAdapter.doesDataStreamExist('foo')).resolves.toEqual(false);
  });

  test('should return false when call cluster returns false from 404', async () => {
    clusterClient.indices.getDataStream.mockRejectedValue({ meta: { statusCode: 404 } });
    await expect(clusterClientAdapter.doesDataStreamExist('foo')).resolves.toEqual(false);
  });

  test('should throw error when call cluster throws an error', async () => {
    clusterClient.indices.getDataStream.mockRejectedValue(new Error('Fail'));
    await expect(
      clusterClientAdapter.doesDataStreamExist('foo')
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"error checking existance of data stream: Fail"`);
  });
});

describe('createDataStream', () => {
  test('should call cluster with proper arguments', async () => {
    await clusterClientAdapter.createDataStream('foo');
    expect(clusterClient.indices.createDataStream).toHaveBeenCalledWith({
      name: 'foo',
    });
  });

  test('should throw error when not getting an error of type resource_already_exists_exception', async () => {
    clusterClient.indices.createDataStream.mockRejectedValue(new Error('Fail'));
    await expect(
      clusterClientAdapter.createDataStream('foo')
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"error creating data stream: Fail"`);
  });

  test(`shouldn't throw when an error of type resource_already_exists_exception is thrown`, async () => {
    // ElasticsearchError can be a bit random in shape, we need an any here

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = new Error('Already exists') as any;
    err.body = {
      error: {
        type: 'resource_already_exists_exception',
      },
    };
    clusterClient.indices.create.mockRejectedValue(err);
    await clusterClientAdapter.createDataStream('foo');
  });
});

describe('updateConcreteIndices', () => {
  test('should call cluster with proper arguments', async () => {
    clusterClient.indices.simulateIndexTemplate.mockImplementationOnce(async () => ({
      template: {
        aliases: { alias_name_1: { is_hidden: true } },
        settings: {
          hidden: true,
          number_of_shards: 1,
          auto_expand_replicas: '0-1',
        },
        mappings: { dynamic: false, properties: { '@timestamp': { type: 'date' } } },
      },
    }));

    await clusterClientAdapter.updateConcreteIndices('foo');
    expect(clusterClient.indices.simulateIndexTemplate).toHaveBeenCalledWith({
      name: 'foo',
    });
    expect(clusterClient.indices.putMapping).toHaveBeenCalledWith({
      index: 'foo',
      body: { dynamic: false, properties: { '@timestamp': { type: 'date' } } },
    });
  });

  test('should not update mapping if simulate response does not contain mappings', async () => {
    // @ts-ignore
    clusterClient.indices.simulateIndexTemplate.mockImplementationOnce(async () => ({
      template: {
        aliases: { alias_name_1: { is_hidden: true } },
        settings: {
          hidden: true,
          number_of_shards: 1,
          auto_expand_replicas: '0-1',
        },
      },
    }));

    await clusterClientAdapter.updateConcreteIndices('foo');
    expect(clusterClient.indices.simulateIndexTemplate).toHaveBeenCalledWith({
      name: 'foo',
    });
    expect(clusterClient.indices.putMapping).not.toHaveBeenCalled();
  });

  test('should throw error if simulateIndexTemplate throws error', async () => {
    clusterClient.indices.simulateIndexTemplate.mockImplementationOnce(() => {
      throw new Error('failed to simulate');
    });

    await expect(() =>
      clusterClientAdapter.updateConcreteIndices('foo')
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"failed to simulate"`);

    expect(clusterClient.indices.putMapping).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      `Error updating index mappings for foo: failed to simulate`
    );
  });

  test('should throw error if putMapping throws error', async () => {
    clusterClient.indices.simulateIndexTemplate.mockImplementationOnce(async () => ({
      template: {
        aliases: { alias_name_1: { is_hidden: true } },
        settings: {
          hidden: true,
          number_of_shards: 1,
          auto_expand_replicas: '0-1',
        },
        mappings: { dynamic: false, properties: { '@timestamp': { type: 'date' } } },
      },
    }));
    clusterClient.indices.putMapping.mockImplementationOnce(() => {
      throw new Error('failed to put mappings');
    });

    await expect(() =>
      clusterClientAdapter.updateConcreteIndices('foo')
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"failed to put mappings"`);

    expect(clusterClient.indices.putMapping).toHaveBeenCalledWith({
      index: 'foo',
      body: { dynamic: false, properties: { '@timestamp': { type: 'date' } } },
    });
    expect(logger.error).toHaveBeenCalledWith(
      `Error updating index mappings for foo: failed to put mappings`
    );
  });
});

describe('queryEventsBySavedObject', () => {
  const DEFAULT_OPTIONS = queryOptionsSchema.validate({});

  test('should call cluster with correct options', async () => {
    clusterClient.search.mockResponse({
      hits: {
        hits: [
          {
            _index: 'index-name-00001',
            _id: '1',
            _source: { foo: 'bar' },
            _seq_no: 1,
            _primary_term: 1,
          },
        ],
        total: { relation: 'eq', value: 1 },
      },
      took: 0,
      timed_out: false,
      _shards: {
        failed: 0,
        successful: 0,
        total: 0,
        skipped: 0,
      },
    });
    const options = {
      index: 'index-name',
      namespace: 'namespace',
      type: 'saved-object-type',
      ids: ['saved-object-id'],
      findOptions: {
        ...DEFAULT_OPTIONS,
        page: 3,
        per_page: 6,
        sort: [
          { sort_field: '@timestamp', sort_order: 'asc' },
          { sort_field: 'event.end', sort_order: 'desc' },
        ],
      },
    };
    const result = await clusterClientAdapter.queryEventsBySavedObjects(options);

    const [query] = clusterClient.search.mock.calls[0];
    expect(query).toEqual({
      index: 'index-name',
      track_total_hits: true,
      seq_no_primary_term: true,
      body: {
        size: 6,
        from: 12,
        query: getQueryBody(logger, options, pick(options.findOptions, ['start', 'end', 'filter'])),
        sort: [{ '@timestamp': { order: 'asc' } }, { 'event.end': { order: 'desc' } }],
      },
    });
    expect(result).toEqual({
      page: 3,
      per_page: 6,
      total: 1,
      data: [{ foo: 'bar', _id: '1', _index: 'index-name-00001', _seq_no: 1, _primary_term: 1 }],
    });
  });
});

describe('aggregateEventsBySavedObject', () => {
  const DEFAULT_OPTIONS = {
    ...queryOptionsSchema.validate({}),
    aggs: {
      genericAgg: {
        term: {
          field: 'event.action',
          size: 10,
        },
      },
    },
  };

  test('should call cluster with correct options', async () => {
    clusterClient.search.mockResponse({
      aggregations: {
        genericAgg: {
          buckets: [
            {
              key: 'execute',
              doc_count: 10,
            },
            {
              key: 'execute-start',
              doc_count: 10,
            },
            {
              key: 'new-instance',
              doc_count: 2,
            },
          ],
        },
      },
      hits: {
        hits: [],
        total: { relation: 'eq', value: 0 },
      },
      took: 0,
      timed_out: false,
      _shards: {
        failed: 0,
        successful: 0,
        total: 0,
        skipped: 0,
      },
    });
    const options: AggregateEventsOptionsBySavedObjectFilter = {
      index: 'index-name',
      namespace: 'namespace',
      type: 'saved-object-type',
      ids: ['saved-object-id'],
      aggregateOptions: DEFAULT_OPTIONS as AggregateOptionsType,
    };
    const result = await clusterClientAdapter.aggregateEventsBySavedObjects(options);

    const [query] = clusterClient.search.mock.calls[0];
    expect(query).toEqual({
      index: 'index-name',
      body: {
        size: 0,
        query: getQueryBody(
          logger,
          options,
          pick(options.aggregateOptions, ['start', 'end', 'filter'])
        ),
        aggs: {
          genericAgg: {
            term: {
              field: 'event.action',
              size: 10,
            },
          },
        },
      },
    });
    expect(result).toEqual({
      aggregations: {
        genericAgg: {
          buckets: [
            {
              key: 'execute',
              doc_count: 10,
            },
            {
              key: 'execute-start',
              doc_count: 10,
            },
            {
              key: 'new-instance',
              doc_count: 2,
            },
          ],
        },
      },
      hits: {
        hits: [],
        total: {
          relation: 'eq',
          value: 0,
        },
      },
    });
  });
});

describe('aggregateEventsWithAuthFilter', () => {
  const DEFAULT_OPTIONS = {
    ...queryOptionsSchema.validate({}),
    aggs: {
      genericAgg: {
        term: {
          field: 'event.action',
          size: 10,
        },
      },
    },
  };

  test('should call cluster with correct options', async () => {
    clusterClient.search.mockResponse({
      aggregations: {
        genericAgg: {
          buckets: [
            {
              key: 'execute',
              doc_count: 10,
            },
            {
              key: 'execute-start',
              doc_count: 10,
            },
            {
              key: 'new-instance',
              doc_count: 2,
            },
          ],
        },
      },
      hits: {
        hits: [],
        total: { relation: 'eq', value: 0 },
      },
      took: 0,
      timed_out: false,
      _shards: {
        failed: 0,
        successful: 0,
        total: 0,
        skipped: 0,
      },
    });
    const options: AggregateEventsWithAuthFilter = {
      index: 'index-name',
      namespaces: ['namespace'],
      type: 'saved-object-type',
      aggregateOptions: DEFAULT_OPTIONS as AggregateOptionsType,
      authFilter: fromKueryExpression('test:test'),
    };
    const result = await clusterClientAdapter.aggregateEventsWithAuthFilter(options);

    const [query] = clusterClient.search.mock.calls[0];
    expect(query).toEqual({
      index: 'index-name',
      body: {
        size: 0,
        query: getQueryBodyWithAuthFilter(
          logger,
          options,
          pick(options.aggregateOptions, ['start', 'end', 'filter'])
        ),
        aggs: {
          genericAgg: {
            term: {
              field: 'event.action',
              size: 10,
            },
          },
        },
      },
    });
    expect(result).toEqual({
      aggregations: {
        genericAgg: {
          buckets: [
            {
              key: 'execute',
              doc_count: 10,
            },
            {
              key: 'execute-start',
              doc_count: 10,
            },
            {
              key: 'new-instance',
              doc_count: 2,
            },
          ],
        },
      },
      hits: {
        hits: [],
        total: {
          relation: 'eq',
          value: 0,
        },
      },
    });
  });

  test('should call cluster with correct options when includeSpaceAgnostic is true', async () => {
    clusterClient.search.mockResponse({
      aggregations: {
        genericAgg: {
          buckets: [
            {
              key: 'execute',
              doc_count: 10,
            },
            {
              key: 'execute-start',
              doc_count: 10,
            },
            {
              key: 'new-instance',
              doc_count: 2,
            },
          ],
        },
      },
      hits: {
        hits: [],
        total: { relation: 'eq', value: 0 },
      },
      took: 0,
      timed_out: false,
      _shards: {
        failed: 0,
        successful: 0,
        total: 0,
        skipped: 0,
      },
    });
    const options: AggregateEventsWithAuthFilter = {
      index: 'index-name',
      namespaces: ['namespace'],
      type: 'saved-object-type',
      aggregateOptions: DEFAULT_OPTIONS as AggregateOptionsType,
      authFilter: fromKueryExpression('test:test'),
      includeSpaceAgnostic: true,
    };
    const result = await clusterClientAdapter.aggregateEventsWithAuthFilter(options);

    const [query] = clusterClient.search.mock.calls[0];
    expect(query).toEqual({
      index: 'index-name',
      body: {
        size: 0,
        query: {
          bool: {
            filter: {
              bool: {
                minimum_should_match: 1,
                should: [
                  {
                    match: {
                      test: 'test',
                    },
                  },
                ],
              },
            },
            must: [
              {
                nested: {
                  path: 'kibana.saved_objects',
                  query: {
                    bool: {
                      must: [
                        {
                          term: {
                            'kibana.saved_objects.rel': {
                              value: 'primary',
                            },
                          },
                        },
                        {
                          term: {
                            'kibana.saved_objects.type': {
                              value: 'saved-object-type',
                            },
                          },
                        },
                        {
                          bool: {
                            should: [
                              {
                                bool: {
                                  should: [
                                    {
                                      term: {
                                        'kibana.saved_objects.namespace': {
                                          value: 'namespace',
                                        },
                                      },
                                    },
                                  ],
                                },
                              },
                              {
                                match: {
                                  'kibana.saved_objects.space_agnostic': true,
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                },
              },
            ],
          },
        },

        aggs: {
          genericAgg: {
            term: {
              field: 'event.action',
              size: 10,
            },
          },
        },
      },
    });
    expect(result).toEqual({
      aggregations: {
        genericAgg: {
          buckets: [
            {
              key: 'execute',
              doc_count: 10,
            },
            {
              key: 'execute-start',
              doc_count: 10,
            },
            {
              key: 'new-instance',
              doc_count: 2,
            },
          ],
        },
      },
      hits: {
        hits: [],
        total: {
          relation: 'eq',
          value: 0,
        },
      },
    });
  });
});

describe('getQueryBody', () => {
  const options = {
    index: 'index-name',
    namespace: undefined,
    type: 'saved-object-type',
    ids: ['saved-object-id'],
  };
  test('should correctly build query with namespace filter when namespace is undefined', () => {
    expect(getQueryBody(logger, options as FindEventsOptionsBySavedObjectFilter, {})).toEqual({
      bool: {
        must: [
          {
            nested: {
              path: 'kibana.saved_objects',
              query: {
                bool: {
                  must: [
                    {
                      term: {
                        'kibana.saved_objects.rel': {
                          value: 'primary',
                        },
                      },
                    },
                    {
                      term: {
                        'kibana.saved_objects.type': {
                          value: 'saved-object-type',
                        },
                      },
                    },
                    {
                      bool: {
                        must_not: {
                          exists: {
                            field: 'kibana.saved_objects.namespace',
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          {
            bool: {
              should: [
                {
                  bool: {
                    must: [
                      {
                        nested: {
                          path: 'kibana.saved_objects',
                          query: {
                            bool: {
                              must: [
                                {
                                  terms: {
                                    'kibana.saved_objects.id': ['saved-object-id'],
                                  },
                                },
                              ],
                            },
                          },
                        },
                      },
                      {
                        range: {
                          'kibana.version': {
                            gte: '8.0.0',
                          },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  test('should correctly build query with namespace filter when namespace is specified', () => {
    expect(
      getQueryBody(
        logger,
        { ...options, namespace: 'namespace' } as FindEventsOptionsBySavedObjectFilter,
        {}
      )
    ).toEqual({
      bool: {
        must: [
          {
            nested: {
              path: 'kibana.saved_objects',
              query: {
                bool: {
                  must: [
                    {
                      term: {
                        'kibana.saved_objects.rel': {
                          value: 'primary',
                        },
                      },
                    },
                    {
                      term: {
                        'kibana.saved_objects.type': {
                          value: 'saved-object-type',
                        },
                      },
                    },
                    {
                      term: {
                        'kibana.saved_objects.namespace': {
                          value: 'namespace',
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          {
            bool: {
              should: [
                {
                  bool: {
                    must: [
                      {
                        nested: {
                          path: 'kibana.saved_objects',
                          query: {
                            bool: {
                              must: [
                                {
                                  terms: {
                                    'kibana.saved_objects.id': ['saved-object-id'],
                                  },
                                },
                              ],
                            },
                          },
                        },
                      },
                      {
                        range: {
                          'kibana.version': {
                            gte: '8.0.0',
                          },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  test('should correctly build query when filter is specified', () => {
    expect(
      getQueryBody(logger, options as FindEventsOptionsBySavedObjectFilter, {
        filter: 'event.provider: alerting AND event.action:execute',
      })
    ).toEqual({
      bool: {
        filter: {
          bool: {
            filter: [
              {
                bool: {
                  minimum_should_match: 1,
                  should: [
                    {
                      match: {
                        'event.provider': 'alerting',
                      },
                    },
                  ],
                },
              },
              {
                bool: {
                  minimum_should_match: 1,
                  should: [
                    {
                      match: {
                        'event.action': 'execute',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        must: [
          {
            nested: {
              path: 'kibana.saved_objects',
              query: {
                bool: {
                  must: [
                    {
                      term: {
                        'kibana.saved_objects.rel': {
                          value: 'primary',
                        },
                      },
                    },
                    {
                      term: {
                        'kibana.saved_objects.type': {
                          value: 'saved-object-type',
                        },
                      },
                    },
                    {
                      bool: {
                        must_not: {
                          exists: {
                            field: 'kibana.saved_objects.namespace',
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          {
            bool: {
              should: [
                {
                  bool: {
                    must: [
                      {
                        nested: {
                          path: 'kibana.saved_objects',
                          query: {
                            bool: {
                              must: [
                                {
                                  terms: {
                                    'kibana.saved_objects.id': ['saved-object-id'],
                                  },
                                },
                              ],
                            },
                          },
                        },
                      },
                      {
                        range: {
                          'kibana.version': {
                            gte: '8.0.0',
                          },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  test('should correctly build query when legacyIds are specified', () => {
    expect(
      getQueryBody(
        logger,
        { ...options, legacyIds: ['legacy-id-1'] } as FindEventsOptionsBySavedObjectFilter,
        {}
      )
    ).toEqual({
      bool: {
        must: [
          {
            nested: {
              path: 'kibana.saved_objects',
              query: {
                bool: {
                  must: [
                    {
                      term: {
                        'kibana.saved_objects.rel': {
                          value: 'primary',
                        },
                      },
                    },
                    {
                      term: {
                        'kibana.saved_objects.type': {
                          value: 'saved-object-type',
                        },
                      },
                    },
                    {
                      bool: {
                        must_not: {
                          exists: {
                            field: 'kibana.saved_objects.namespace',
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          {
            bool: {
              should: [
                {
                  bool: {
                    must: [
                      {
                        nested: {
                          path: 'kibana.saved_objects',
                          query: {
                            bool: {
                              must: [
                                {
                                  terms: {
                                    'kibana.saved_objects.id': ['saved-object-id'],
                                  },
                                },
                              ],
                            },
                          },
                        },
                      },
                      {
                        range: {
                          'kibana.version': {
                            gte: '8.0.0',
                          },
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    must: [
                      {
                        nested: {
                          path: 'kibana.saved_objects',
                          query: {
                            bool: {
                              must: [
                                {
                                  terms: {
                                    'kibana.saved_objects.id': ['legacy-id-1'],
                                  },
                                },
                              ],
                            },
                          },
                        },
                      },
                      {
                        bool: {
                          should: [
                            {
                              range: {
                                'kibana.version': {
                                  lt: '8.0.0',
                                },
                              },
                            },
                            {
                              bool: {
                                must_not: {
                                  exists: {
                                    field: 'kibana.version',
                                  },
                                },
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  test('should correctly build query when start is specified', () => {
    expect(
      getQueryBody(logger, options as FindEventsOptionsBySavedObjectFilter, {
        start: '2020-07-08T00:52:28.350Z',
      })
    ).toEqual({
      bool: {
        must: [
          {
            nested: {
              path: 'kibana.saved_objects',
              query: {
                bool: {
                  must: [
                    {
                      term: {
                        'kibana.saved_objects.rel': {
                          value: 'primary',
                        },
                      },
                    },
                    {
                      term: {
                        'kibana.saved_objects.type': {
                          value: 'saved-object-type',
                        },
                      },
                    },
                    {
                      bool: {
                        must_not: {
                          exists: {
                            field: 'kibana.saved_objects.namespace',
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          {
            bool: {
              should: [
                {
                  bool: {
                    must: [
                      {
                        nested: {
                          path: 'kibana.saved_objects',
                          query: {
                            bool: {
                              must: [
                                {
                                  terms: {
                                    'kibana.saved_objects.id': ['saved-object-id'],
                                  },
                                },
                              ],
                            },
                          },
                        },
                      },
                      {
                        range: {
                          'kibana.version': {
                            gte: '8.0.0',
                          },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          {
            range: {
              '@timestamp': {
                gte: '2020-07-08T00:52:28.350Z',
              },
            },
          },
        ],
      },
    });
  });

  test('should correctly build query when end is specified', () => {
    expect(
      getQueryBody(logger, options as FindEventsOptionsBySavedObjectFilter, {
        end: '2020-07-10T00:52:28.350Z',
      })
    ).toEqual({
      bool: {
        must: [
          {
            nested: {
              path: 'kibana.saved_objects',
              query: {
                bool: {
                  must: [
                    {
                      term: {
                        'kibana.saved_objects.rel': {
                          value: 'primary',
                        },
                      },
                    },
                    {
                      term: {
                        'kibana.saved_objects.type': {
                          value: 'saved-object-type',
                        },
                      },
                    },
                    {
                      bool: {
                        must_not: {
                          exists: {
                            field: 'kibana.saved_objects.namespace',
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          {
            bool: {
              should: [
                {
                  bool: {
                    must: [
                      {
                        nested: {
                          path: 'kibana.saved_objects',
                          query: {
                            bool: {
                              must: [
                                {
                                  terms: {
                                    'kibana.saved_objects.id': ['saved-object-id'],
                                  },
                                },
                              ],
                            },
                          },
                        },
                      },
                      {
                        range: {
                          'kibana.version': {
                            gte: '8.0.0',
                          },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          {
            range: {
              '@timestamp': {
                lte: '2020-07-10T00:52:28.350Z',
              },
            },
          },
        ],
      },
    });
  });

  test('should correctly build query when start and end are specified', () => {
    expect(
      getQueryBody(logger, options as FindEventsOptionsBySavedObjectFilter, {
        start: '2020-07-08T00:52:28.350Z',
        end: '2020-07-10T00:52:28.350Z',
      })
    ).toEqual({
      bool: {
        must: [
          {
            nested: {
              path: 'kibana.saved_objects',
              query: {
                bool: {
                  must: [
                    {
                      term: {
                        'kibana.saved_objects.rel': {
                          value: 'primary',
                        },
                      },
                    },
                    {
                      term: {
                        'kibana.saved_objects.type': {
                          value: 'saved-object-type',
                        },
                      },
                    },
                    {
                      bool: {
                        must_not: {
                          exists: {
                            field: 'kibana.saved_objects.namespace',
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          {
            bool: {
              should: [
                {
                  bool: {
                    must: [
                      {
                        nested: {
                          path: 'kibana.saved_objects',
                          query: {
                            bool: {
                              must: [
                                {
                                  terms: {
                                    'kibana.saved_objects.id': ['saved-object-id'],
                                  },
                                },
                              ],
                            },
                          },
                        },
                      },
                      {
                        range: {
                          'kibana.version': {
                            gte: '8.0.0',
                          },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          {
            range: {
              '@timestamp': {
                gte: '2020-07-08T00:52:28.350Z',
              },
            },
          },
          {
            range: {
              '@timestamp': {
                lte: '2020-07-10T00:52:28.350Z',
              },
            },
          },
        ],
      },
    });
  });
});

describe('getQueryBodyWithAuthFilter', () => {
  const options = {
    index: 'index-name',
    namespaces: undefined,
    type: 'saved-object-type',
    authFilter: fromKueryExpression('test:test'),
  };
  test('should correctly build query with namespace filter when namespace is undefined', () => {
    expect(
      getQueryBodyWithAuthFilter(logger, options as AggregateEventsWithAuthFilter, {})
    ).toEqual({
      bool: {
        filter: {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                match: {
                  test: 'test',
                },
              },
            ],
          },
        },
        must: [
          {
            nested: {
              path: 'kibana.saved_objects',
              query: {
                bool: {
                  must: [
                    {
                      term: {
                        'kibana.saved_objects.rel': {
                          value: 'primary',
                        },
                      },
                    },
                    {
                      term: {
                        'kibana.saved_objects.type': {
                          value: 'saved-object-type',
                        },
                      },
                    },
                    {
                      bool: {
                        should: [
                          {
                            bool: {
                              must_not: {
                                exists: {
                                  field: 'kibana.saved_objects.namespace',
                                },
                              },
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            },
          },
        ],
      },
    });
  });

  test('should correctly build query with namespace filter when namespace is specified', () => {
    expect(
      getQueryBodyWithAuthFilter(
        logger,
        { ...options, namespaces: ['namespace'] } as AggregateEventsWithAuthFilter,
        {}
      )
    ).toEqual({
      bool: {
        filter: {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                match: {
                  test: 'test',
                },
              },
            ],
          },
        },
        must: [
          {
            nested: {
              path: 'kibana.saved_objects',
              query: {
                bool: {
                  must: [
                    {
                      term: {
                        'kibana.saved_objects.rel': {
                          value: 'primary',
                        },
                      },
                    },
                    {
                      term: {
                        'kibana.saved_objects.type': {
                          value: 'saved-object-type',
                        },
                      },
                    },
                    {
                      bool: {
                        should: [
                          {
                            term: {
                              'kibana.saved_objects.namespace': {
                                value: 'namespace',
                              },
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            },
          },
        ],
      },
    });
  });

  test('should correctly build query when filter is specified', () => {
    expect(
      getQueryBodyWithAuthFilter(logger, options as AggregateEventsWithAuthFilter, {
        filter: 'event.provider: alerting AND event.action:execute',
      })
    ).toEqual({
      bool: {
        filter: {
          bool: {
            filter: [
              {
                bool: {
                  filter: [
                    {
                      bool: {
                        minimum_should_match: 1,
                        should: [
                          {
                            match: {
                              'event.provider': 'alerting',
                            },
                          },
                        ],
                      },
                    },
                    {
                      bool: {
                        minimum_should_match: 1,
                        should: [
                          {
                            match: {
                              'event.action': 'execute',
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
              {
                bool: {
                  minimum_should_match: 1,
                  should: [
                    {
                      match: {
                        test: 'test',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        must: [
          {
            nested: {
              path: 'kibana.saved_objects',
              query: {
                bool: {
                  must: [
                    {
                      term: {
                        'kibana.saved_objects.rel': {
                          value: 'primary',
                        },
                      },
                    },
                    {
                      term: {
                        'kibana.saved_objects.type': {
                          value: 'saved-object-type',
                        },
                      },
                    },
                    {
                      bool: {
                        should: [
                          {
                            bool: {
                              must_not: {
                                exists: {
                                  field: 'kibana.saved_objects.namespace',
                                },
                              },
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            },
          },
        ],
      },
    });
  });

  test('should correctly build query when start is specified', () => {
    expect(
      getQueryBodyWithAuthFilter(logger, options as AggregateEventsWithAuthFilter, {
        start: '2020-07-08T00:52:28.350Z',
      })
    ).toEqual({
      bool: {
        filter: {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                match: {
                  test: 'test',
                },
              },
            ],
          },
        },
        must: [
          {
            nested: {
              path: 'kibana.saved_objects',
              query: {
                bool: {
                  must: [
                    {
                      term: {
                        'kibana.saved_objects.rel': {
                          value: 'primary',
                        },
                      },
                    },
                    {
                      term: {
                        'kibana.saved_objects.type': {
                          value: 'saved-object-type',
                        },
                      },
                    },
                    {
                      bool: {
                        should: [
                          {
                            bool: {
                              must_not: {
                                exists: {
                                  field: 'kibana.saved_objects.namespace',
                                },
                              },
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            },
          },
          {
            range: {
              '@timestamp': {
                gte: '2020-07-08T00:52:28.350Z',
              },
            },
          },
        ],
      },
    });
  });

  test('should correctly build query when end is specified', () => {
    expect(
      getQueryBodyWithAuthFilter(logger, options as AggregateEventsWithAuthFilter, {
        end: '2020-07-10T00:52:28.350Z',
      })
    ).toEqual({
      bool: {
        filter: {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                match: {
                  test: 'test',
                },
              },
            ],
          },
        },
        must: [
          {
            nested: {
              path: 'kibana.saved_objects',
              query: {
                bool: {
                  must: [
                    {
                      term: {
                        'kibana.saved_objects.rel': {
                          value: 'primary',
                        },
                      },
                    },
                    {
                      term: {
                        'kibana.saved_objects.type': {
                          value: 'saved-object-type',
                        },
                      },
                    },
                    {
                      bool: {
                        should: [
                          {
                            bool: {
                              must_not: {
                                exists: {
                                  field: 'kibana.saved_objects.namespace',
                                },
                              },
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            },
          },
          {
            range: {
              '@timestamp': {
                lte: '2020-07-10T00:52:28.350Z',
              },
            },
          },
        ],
      },
    });
  });

  test('should correctly build query when start and end are specified', () => {
    expect(
      getQueryBodyWithAuthFilter(logger, options as AggregateEventsWithAuthFilter, {
        start: '2020-07-08T00:52:28.350Z',
        end: '2020-07-10T00:52:28.350Z',
      })
    ).toEqual({
      bool: {
        filter: {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                match: {
                  test: 'test',
                },
              },
            ],
          },
        },
        must: [
          {
            nested: {
              path: 'kibana.saved_objects',
              query: {
                bool: {
                  must: [
                    {
                      term: {
                        'kibana.saved_objects.rel': {
                          value: 'primary',
                        },
                      },
                    },
                    {
                      term: {
                        'kibana.saved_objects.type': {
                          value: 'saved-object-type',
                        },
                      },
                    },
                    {
                      bool: {
                        should: [
                          {
                            bool: {
                              must_not: {
                                exists: {
                                  field: 'kibana.saved_objects.namespace',
                                },
                              },
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            },
          },
          {
            range: {
              '@timestamp': {
                gte: '2020-07-08T00:52:28.350Z',
              },
            },
          },
          {
            range: {
              '@timestamp': {
                lte: '2020-07-10T00:52:28.350Z',
              },
            },
          },
        ],
      },
    });
  });
});

describe('updateDocuments', () => {
  test('should successfully update document with meta information', async () => {
    const doc = {
      body: { foo: 'updated' },
      index: 'test-index',
      internalFields: {
        _id: 'test-id',
        _index: 'test-index',
        _seq_no: 1,
        _primary_term: 1,
      },
    };

    clusterClient.bulk.mockResponse({
      took: 15,
      items: [
        {
          update: {
            _index: 'test-index',
            _id: 'test-id',
            _version: 2,
            result: 'updated',
            status: 200,
            _shards: {
              total: 2,
              successful: 1,
              failed: 0,
            },
            _seq_no: 2,
            _primary_term: 1,
          },
        },
      ],
      errors: false,
    });

    await clusterClientAdapter.updateDocuments([doc as unknown as Required<Doc>]);

    expect(clusterClient.bulk).toHaveBeenCalledWith({
      body: [
        {
          update: {
            _id: doc.internalFields._id,
            _index: doc.internalFields._index,
            if_primary_term: doc.internalFields._primary_term,
            if_seq_no: doc.internalFields._seq_no,
          },
        },
        { doc: doc.body },
      ],
    });
  });

  test('should throw error if internal fields information is missing', async () => {
    const doc = {
      body: { foo: 'updated' },
      index: 'test-index',
    };

    await expect(
      clusterClientAdapter.updateDocuments([doc as unknown as Required<Doc>])
    ).rejects.toThrowErrorMatchingInlineSnapshot('"Internal fields are required"');

    expect(logger.error).toHaveBeenCalledWith(
      `error updating events in bulk: "Internal fields are required"; docs: ${JSON.stringify([
        doc,
      ])}`
    );
  });

  test('should throw error when update fails', async () => {
    const doc = {
      body: { foo: 'updated' },
      index: 'test-index',
      internalFields: {
        _id: 'test-id',
        _index: 'test-index',
        _seq_no: 1,
        _primary_term: 1,
      },
    };

    const error = new Error('Update failed');
    clusterClient.bulk.mockRejectedValue(error);

    await expect(
      clusterClientAdapter.updateDocuments([doc as unknown as Required<Doc>])
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Update failed"`);

    expect(logger.error).toHaveBeenCalledWith(
      `error updating events in bulk: "Update failed"; docs: ${JSON.stringify([doc])}`
    );
  });

  test('should log error when bulk response contains errors', async () => {
    const doc = {
      body: { foo: 'updated' },
      index: 'test-index',
      internalFields: {
        _id: 'test-id',
        _index: 'test-index',
        _seq_no: 1,
        _primary_term: 1,
      },
    };

    const errorItem = {
      update: {
        _index: 'test-index',
        _id: 'test-id',
        status: 400,
        error: {
          type: 'version_conflict_engine_exception',
          reason: 'version conflict',
        },
      },
    };

    const bulkResponse = {
      took: 15,
      items: [errorItem],
      errors: true,
    };

    clusterClient.bulk.mockResponse(bulkResponse);

    const response = await clusterClientAdapter.updateDocuments([doc as unknown as Required<Doc>]);

    expect(response).toEqual(bulkResponse);
    expect(logger.error).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Error updating some bulk events',
      })
    );
  });
});

describe('queryEventsByDocumentIds', () => {
  test('should successfully retrieve documents by ids', async () => {
    const docs = [
      { _id: 'test-id-1', _index: 'test-index' },
      { _id: 'test-id-2', _index: 'test-index' },
    ];

    clusterClient.mget.mockResponse({
      docs: [
        {
          _index: 'test-index',
          _id: 'test-id-1',
          _seq_no: 1,
          _primary_term: 1,
          found: true,
          _source: { message: 'test 1' },
        },
        {
          _index: 'test-index',
          _id: 'test-id-2',
          _seq_no: 2,
          _primary_term: 1,
          found: true,
          _source: { message: 'test 2' },
        },
      ],
    });

    const result = await clusterClientAdapter.queryEventsByDocumentIds(docs);

    expect(clusterClient.mget).toHaveBeenCalledWith({
      docs,
    });

    expect(result).toEqual({
      data: [
        {
          message: 'test 1',
          _id: 'test-id-1',
          _index: 'test-index',
          _seq_no: 1,
          _primary_term: 1,
        },
        {
          message: 'test 2',
          _id: 'test-id-2',
          _index: 'test-index',
          _seq_no: 2,
          _primary_term: 1,
        },
      ],
    });
  });

  test('should handle not found documents', async () => {
    const docs = [
      { _id: 'test-id-1', _index: 'test-index' },
      { _id: 'test-id-2', _index: 'test-index' },
    ];

    clusterClient.mget.mockResponse({
      docs: [
        {
          _index: 'test-index',
          _id: 'test-id-1',
          found: false,
        },
        {
          _index: 'test-index',
          _id: 'test-id-2',
          _seq_no: 2,
          _primary_term: 1,
          found: true,
          _source: { message: 'test 2' },
        },
      ],
    });

    const result = await clusterClientAdapter.queryEventsByDocumentIds(docs);

    expect(logger.error).toHaveBeenCalledWith('Event not found: test-id-1');
    expect(result).toEqual({
      data: [
        {
          message: 'test 2',
          _id: 'test-id-2',
          _index: 'test-index',
          _seq_no: 2,
          _primary_term: 1,
        },
      ],
    });
  });

  test('should handle documents with errors', async () => {
    const docs = [
      { _id: 'test-id-1', _index: 'test-index' },
      { _id: 'test-id-2', _index: 'test-index' },
    ];

    clusterClient.mget.mockResponse({
      docs: [
        {
          _index: 'test-index',
          _id: 'test-id-1',
          error: {
            type: 'document_missing_exception',
            reason: 'Document missing',
          },
        },
        {
          _index: 'test-index',
          _id: 'test-id-2',
          _seq_no: 2,
          _primary_term: 1,
          found: true,
          _source: { message: 'test 2' },
        },
      ],
    });

    const result = await clusterClientAdapter.queryEventsByDocumentIds(docs);

    expect(logger.error).toHaveBeenCalledWith(
      'Event not found: test-id-1, with error: Document missing'
    );
    expect(result).toEqual({
      data: [
        {
          message: 'test 2',
          _id: 'test-id-2',
          _index: 'test-index',
          _seq_no: 2,
          _primary_term: 1,
        },
      ],
    });
  });

  test('should throw error when mget fails', async () => {
    const docs = [
      { _id: 'test-id-1', _index: 'test-index' },
      { _id: 'test-id-2', _index: 'test-index' },
    ];

    clusterClient.mget.mockRejectedValue(new Error('Failed to get documents'));

    await expect(
      clusterClientAdapter.queryEventsByDocumentIds(docs)
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"error querying events by document ids: Failed to get documents"`
    );
  });
});

describe('refreshIndex', () => {
  test('should successfully refresh index', async () => {
    clusterClient.indices.refresh.mockResolvedValue({});

    await clusterClientAdapter.refreshIndex();

    expect(clusterClient.indices.refresh).toHaveBeenCalledWith({
      index: 'kibana-event-log-ds',
    });
  });

  test('should throw error when refresh fails', async () => {
    clusterClient.indices.refresh.mockRejectedValue(new Error('Failed to refresh index'));

    await expect(clusterClientAdapter.refreshIndex()).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Failed to refresh index"`
    );
  });
});
type RetryableFunction = () => boolean;

const RETRY_UNTIL_DEFAULT_COUNT = 20;
const RETRY_UNTIL_DEFAULT_WAIT = 1000; // milliseconds

async function retryUntil(
  label: string,
  fn: RetryableFunction,
  count: number = RETRY_UNTIL_DEFAULT_COUNT,
  wait: number = RETRY_UNTIL_DEFAULT_WAIT
): Promise<boolean> {
  while (count > 0) {
    count--;

    if (fn()) return true;

    // eslint-disable-next-line no-console
    console.log(`attempt failed waiting for "${label}", attempts left: ${count}`);

    if (count === 0) return false;
    await delay(wait);
  }

  return false;
}
