/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

import { cleanUpOldFileIndices } from './clean_old_fleet_indices';

describe('cleanUpOldFileIndices', () => {
  it('should clean old indices and old index templates', async () => {
    const logger = loggingSystemMock.createLogger();
    const esClient = elasticsearchServiceMock.createInternalClient();
    esClient.indices.get.mockResolvedValueOnce({
      '.fleet-files-agent': {},
      '.fleet-files-test': {},
    });
    esClient.indices.get.mockImplementation(({ index }) => {
      if (index === '.fleet-files-agent') {
        return {
          '.fleet-files-agent': {},
          '.fleet-files-test': {},
        } as any;
      }
      return {};
    });

    await cleanUpOldFileIndices(esClient, logger);

    expect(esClient.indices.delete).toBeCalledTimes(1);
    expect(esClient.indices.delete).toBeCalledWith(
      expect.objectContaining({
        index: '.fleet-files-agent,.fleet-files-test',
      })
    );

    expect(esClient.indices.deleteIndexTemplate).toBeCalledTimes(1);
    expect(esClient.indices.deleteIndexTemplate).toBeCalledWith(
      expect.objectContaining({
        name: '.fleet-files,.fleet-file-data,.fleet-filedelivery-data,.fleet-filedelivery-meta',
      })
    );
    expect(logger.warn).not.toBeCalled();
  });

  it('should log a warning and not throw if an unexpected error happen', async () => {
    const logger = loggingSystemMock.createLogger();
    const esClient = elasticsearchServiceMock.createInternalClient();
    esClient.indices.get.mockRejectedValue(new Error('test error'));

    await cleanUpOldFileIndices(esClient, logger);

    expect(logger.warn).toBeCalledWith('Old fleet indices cleanup failed: test error');
  });

  it('should handle 404 while deleting index template', async () => {
    const logger = loggingSystemMock.createLogger();
    const esClient = elasticsearchServiceMock.createInternalClient();
    esClient.indices.get.mockResolvedValue({});
    esClient.indices.deleteIndexTemplate.mockRejectedValue({
      meta: {
        statusCode: 404,
      },
    });

    await cleanUpOldFileIndices(esClient, logger);

    expect(esClient.indices.deleteIndexTemplate).toBeCalledTimes(1);
    expect(logger.warn).not.toBeCalled();
  });

  it('should handle 404 when deleting old index', async () => {
    const logger = loggingSystemMock.createLogger();
    const esClient = elasticsearchServiceMock.createInternalClient();
    esClient.indices.get.mockResolvedValueOnce({
      '.fleet-files-agent': {},
      '.fleet-files-test': {},
    });
    esClient.indices.get.mockImplementation(({ index }) => {
      if (index === '.fleet-files-agent') {
        return {
          '.fleet-files-agent': {},
          '.fleet-files-test': {},
        } as any;
      }
      return {};
    });

    esClient.indices.delete.mockRejectedValue({
      meta: {
        statusCode: 404,
      },
    });

    await cleanUpOldFileIndices(esClient, logger);

    expect(esClient.indices.delete).toBeCalledTimes(1);
    expect(logger.warn).not.toBeCalled();
  });
});
