/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';

import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

import { createFileClientMock } from '@kbn/files-plugin/server/mocks';

import { createEsFileClient as _createEsFileClient } from '@kbn/files-plugin/server';

import type { estypes } from '@elastic/elasticsearch';

import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';

import type { File } from '@kbn/files-plugin/common';

import { getFileDataIndexName, getFileMetadataIndexName } from '../../../common';

import type { FileCustomMeta } from './types';

import { createFromHostEsSearchResponseMock } from './mocks';

import { FleetFromHostFilesClient } from './client_from_host';
import type { HostUploadedFileMetadata } from './types';

jest.mock('@kbn/files-plugin/server');

const createEsFileClientMock = _createEsFileClient as jest.Mock;

describe('FleetFromHostFilesClient', () => {
  let esClientMock: ElasticsearchClientMock;
  let esFileClientMock: ReturnType<typeof createFileClientMock>;
  let esFile: DeeplyMockedKeys<File>;

  let loggerMock: ReturnType<typeof loggingSystemMock.createLogger>;
  let fleetFilesIndexSearchResponse: estypes.SearchResponse<HostUploadedFileMetadata>;
  let fleetFileDataIndexSearchResponse: estypes.SearchResponse;

  const getFleetFilesInstance = (): FleetFromHostFilesClient => {
    loggerMock = loggingSystemMock.createLogger();

    return new FleetFromHostFilesClient(
      esClientMock,
      loggerMock,
      getFileMetadataIndexName('foo'),
      getFileDataIndexName('foo')
    );
  };

  beforeEach(async () => {
    esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    esFileClientMock = createFileClientMock<FileCustomMeta>({
      hash: {
        sha256: 'e5441eb2bb8a774783d4ff4690153832688bd546c878e953acc3da089ac05d06',
      },
      meta: {
        action_id: '123',
        target_agents: ['abc'],
      },
    });
    createEsFileClientMock.mockReturnValue(esFileClientMock);
    esFile = (await esFileClientMock.get({ id: '1' })) as DeeplyMockedKeys<File>;

    fleetFilesIndexSearchResponse = createFromHostEsSearchResponseMock();
    fleetFileDataIndexSearchResponse = {
      took: 3,
      timed_out: false,
      _shards: {
        total: 2,
        successful: 2,
        skipped: 0,
        failed: 0,
      },
      hits: {
        total: {
          value: 1,
          relation: 'eq',
        },
        max_score: 0,
        hits: [{ _index: '', _id: '' }],
      },
    };

    esClientMock.search.mockImplementation(async (searchRequest = {}) => {
      // File metadata
      if ((searchRequest.index as string).startsWith('.fleet-fileds-fromhost-meta-')) {
        return fleetFilesIndexSearchResponse;
      }

      if ((searchRequest.index as string).startsWith('.fleet-fileds-fromhost-data-')) {
        return fleetFileDataIndexSearchResponse;
      }

      throw new Error(
        `esClientMock.search(): no mock implemented for route: ${JSON.stringify(searchRequest)}`
      );
    });
  });

  it('should create internal ES File client with expected arguments', () => {
    getFleetFilesInstance();

    expect(createEsFileClientMock).toHaveBeenCalledWith({
      elasticsearchClient: esClientMock,
      logger: loggerMock,
      metadataIndex: '.fleet-fileds-fromhost-meta-foo',
      blobStorageIndex: '.fleet-fileds-fromhost-data-foo',
      indexIsAlias: true,
    });
  });

  describe('#get() method', () => {
    it('should retrieve file info', async () => {
      await expect(getFleetFilesInstance().get('123')).resolves.toEqual({
        actionId: '83484393-ddba-4f3c-9c7e-f492ee198a85',
        agents: ['eef9254d-f3ed-4518-889f-18714bd6cec1'],
        created: '2023-01-23T16:50:51.278Z',
        id: '123',
        mimeType: 'application/zip',
        name: 'upload.zip',
        sha256: 'e5441eb2bb8a774783d4ff4690153832688bd546c878e953acc3da089ac05d06',
        size: 64395,
        status: 'READY',
      });
    });

    it('should adjust `status` if no data exists for file', async () => {
      (fleetFileDataIndexSearchResponse.hits.total as estypes.SearchTotalHits).value = 0;
      fleetFileDataIndexSearchResponse.hits.hits = [];

      await expect(getFleetFilesInstance().get('123')).resolves.toHaveProperty('status', 'DELETED');
    });
  });

  describe('#doesFileHaveData() method', () => {
    it('should search data index for file id', async () => {
      await getFleetFilesInstance().doesFileHaveData('123');

      expect(esClientMock.search).toHaveBeenCalledWith({
        body: {
          _source: false,
          query: {
            bool: {
              filter: [
                {
                  term: {
                    bid: '123',
                  },
                },
              ],
            },
          },
        },
        index: '.fleet-fileds-fromhost-data-foo',
        size: 0,
      });
    });

    it('should return `true` if data exists', async () => {
      await expect(getFleetFilesInstance().doesFileHaveData('123')).resolves.toBe(true);
    });

    it('should return `false` if no data exists', async () => {
      (fleetFileDataIndexSearchResponse.hits.total as estypes.SearchTotalHits).value = 0;
      fleetFileDataIndexSearchResponse.hits.hits = [];

      await expect(getFleetFilesInstance().doesFileHaveData('123')).resolves.toBe(false);
    });
  });

  describe('#download() method', () => {
    it('should should return expected response', async () => {
      await expect(getFleetFilesInstance().download('123')).resolves.toEqual({
        stream: expect.any(Readable),
        fileName: 'test.txt',
        mimeType: 'text/plain',
      });
    });

    it('should throw an error if unable to get file record', async () => {
      esFile.downloadContent.mockRejectedValue(new Error('oh oh'));

      await expect(getFleetFilesInstance().download('123')).rejects.toThrow(
        'Attempt to get download stream failed with: oh oh'
      );
    });
  });
});
