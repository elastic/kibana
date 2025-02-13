/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';

import { prepareToInstallPipelines } from './install';

jest.mock('../../archive/cache');

describe('Install pipeline tests', () => {
  describe('prepareToInstallPipelines', () => {
    it('should work with datastream without ingest pipeline define in the package', async () => {
      const res = prepareToInstallPipelines({
        packageInfo: {
          version: '1.0.0',
          data_streams: [
            {
              dataset: 'datasettest',
              type: 'logs',
              package: 'packagetest',
              path: '/datasettest',
            },
          ],
        },
        paths: [],
        assetsMap: new Map(),
      } as any);

      expect(res.assetsToAdd).toEqual([{ id: 'logs-datasettest-1.0.0', type: 'ingest_pipeline' }]);
      const esClient = elasticsearchClientMock.createInternalClient();
      const logger = loggerMock.create();
      await res.install(esClient, logger);

      expect(esClient.ingest.putPipeline).toBeCalled();

      // It should add the @custom pipeline for the main pipeline
      const pipelinesWithCustomProcessor = esClient.ingest.putPipeline.mock.calls.filter((call) =>
        // @ts-ignore-error
        call[0]?.body.includes('@custom')
      );

      expect(pipelinesWithCustomProcessor).toHaveLength(1);
    });

    it('should work with datastream with ingest pipelines define in the package', async () => {
      const res = prepareToInstallPipelines({
        packageInfo: {
          version: '1.0.0',
          data_streams: [
            {
              dataset: 'datasettest',
              type: 'logs',
              package: 'packagetest',
              path: 'datasettest',
              ingest_pipeline: 'default',
            },
          ],
        },
        paths: [
          'packagetest-1.0.0/data_stream/datasettest/elasticsearch/ingest_pipeline/default.yml',
          'packagetest-1.0.0/data_stream/datasettest/elasticsearch/ingest_pipeline/standard.yml',
        ],
        assetsMap: new Map([
          [
            'packagetest-1.0.0/data_stream/datasettest/elasticsearch/ingest_pipeline/default.yml',
            Buffer.from('description: test'),
          ],
          [
            'packagetest-1.0.0/data_stream/datasettest/elasticsearch/ingest_pipeline/standard.yml',
            Buffer.from('description: test'),
          ],
        ]),
      } as any);
      expect(res.assetsToAdd).toEqual([
        { id: 'logs-datasettest-1.0.0', type: 'ingest_pipeline' },
        { id: 'logs-datasettest-1.0.0-standard', type: 'ingest_pipeline' },
      ]);

      const esClient = elasticsearchClientMock.createInternalClient();
      const logger = loggerMock.create();

      await res.install(esClient, logger);

      expect(esClient.ingest.putPipeline).toBeCalledTimes(2);

      // It should add the @custom pipeline only for the main pipeline
      const pipelinesWithCustomProcessor = esClient.ingest.putPipeline.mock.calls.filter((call) =>
        // @ts-ignore-error
        call[0]?.body.includes('@custom')
      );

      expect(pipelinesWithCustomProcessor).toHaveLength(1);
    });
  });
});
