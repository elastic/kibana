/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { GetDataStreamMappingsRes } from './get_datastream_mappings';
import { getDataStreamMappings } from './get_datastream_mappings';
import { cleanupMapping } from './cleanup_mapping';

jest.mock('./cleanup_mapping');

const cleanupMappingMock = cleanupMapping as jest.MockedFunction<typeof cleanupMapping>;

describe('mappings utilities', () => {
  const mappingsA: MappingTypeMapping = {
    properties: {
      foo: { type: 'text' },
    },
  };
  const mappingsB: MappingTypeMapping = {
    properties: {
      bar: { type: 'keyword' },
    },
  };

  describe('getDatastreamMappings', () => {
    let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

    beforeEach(() => {
      esClient = elasticsearchServiceMock.createElasticsearchClient();
      cleanupMappingMock.mockImplementation((mappings) => mappings);
    });

    afterEach(() => {
      cleanupMappingMock.mockReset();
    });

    it('calls the ES client with the right parameters', async () => {
      const response: GetDataStreamMappingsRes = {
        data_streams: [],
      };

      esClient.transport.request.mockResolvedValue(response);

      await getDataStreamMappings({
        datastreams: ['streamA', 'streamB'],
        esClient,
        cleanup: false,
      });

      expect(esClient.transport.request).toHaveBeenCalledTimes(1);
      expect(esClient.transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: `/_data_stream/streamA,streamB/_mappings`,
      });
    });

    it('retrieve the mappings for a single datastream', async () => {
      const response: GetDataStreamMappingsRes = {
        data_streams: [
          {
            name: 'data_stream',
            effective_mappings: {
              _doc: mappingsA,
            },
          },
        ],
      };

      esClient.transport.request.mockResolvedValue(response);

      const res = await getDataStreamMappings({
        datastreams: ['data_stream'],
        esClient,
        cleanup: false,
      });

      expect(Object.keys(res).length).toBe(1);
      expect(Object.keys(res)).toEqual(['data_stream']);

      expect(res.data_stream.mappings).toEqual(mappingsA);
    });

    it('retrieve the mappings for multiple datastreams', async () => {
      const response: GetDataStreamMappingsRes = {
        data_streams: [
          {
            name: 'stream_A',
            effective_mappings: {
              _doc: mappingsA,
            },
          },
          {
            name: 'stream_B',
            effective_mappings: {
              _doc: mappingsB,
            },
          },
        ],
      };

      esClient.transport.request.mockResolvedValue(response);

      const res = await getDataStreamMappings({
        datastreams: ['stream_A', 'stream_B'],
        esClient,
        cleanup: false,
      });

      expect(Object.keys(res).length).toBe(2);
      expect(Object.keys(res).sort()).toEqual(['stream_A', 'stream_B']);

      expect(res.stream_A.mappings).toEqual(mappingsA);
      expect(res.stream_B.mappings).toEqual(mappingsB);
    });

    it('does not call cleanupMappings when cleanup=false', async () => {
      const response: GetDataStreamMappingsRes = {
        data_streams: [
          {
            name: 'data_stream',
            effective_mappings: {
              _doc: mappingsA,
            },
          },
        ],
      };

      esClient.transport.request.mockResolvedValue(response);

      await getDataStreamMappings({
        datastreams: ['data_stream'],
        esClient,
        cleanup: false,
      });

      expect(cleanupMappingMock).not.toHaveBeenCalled();
    });

    it('calls cleanupMappings when cleanup=true', async () => {
      const response: GetDataStreamMappingsRes = {
        data_streams: [
          {
            name: 'stream_A',
            effective_mappings: {
              _doc: mappingsA,
            },
          },
          {
            name: 'stream_B',
            effective_mappings: {
              _doc: mappingsB,
            },
          },
        ],
      };

      esClient.transport.request.mockResolvedValue(response);

      await getDataStreamMappings({
        datastreams: ['stream_A', 'stream_B'],
        esClient,
        cleanup: true,
      });

      expect(cleanupMappingMock).toHaveBeenCalledTimes(2);
      expect(cleanupMappingMock).toHaveBeenCalledWith(mappingsA);
      expect(cleanupMappingMock).toHaveBeenCalledWith(mappingsB);
    });

    it('retrieve the mappings when the response follows the documented format', async () => {
      const response: GetDataStreamMappingsRes = {
        data_streams: [
          {
            name: 'data_stream',
            effective_mappings: mappingsA,
          },
        ],
      };

      esClient.transport.request.mockResolvedValue(response);

      const res = await getDataStreamMappings({
        datastreams: ['data_stream'],
        esClient,
        cleanup: false,
      });

      expect(Object.keys(res).length).toBe(1);
      expect(Object.keys(res)).toEqual(['data_stream']);

      expect(res.data_stream.mappings).toEqual(mappingsA);
    });
  });
});
