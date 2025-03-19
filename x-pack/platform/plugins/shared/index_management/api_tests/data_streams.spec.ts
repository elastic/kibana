/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { describe, apiTest, expectTypeOf } from '@kbn/scout-api-tests';
import { Client } from '@elastic/elasticsearch';

import { DataStream } from '../common';

const API_BASE_PATH = 'api/index_management';

describe('Data streams', function () {
  const createDataStream = async (es: Client, name: string, indexMode?: string) => {
    // A data stream requires an index template before it can be created.
    await es.indices.putIndexTemplate({
      name,
      // We need to match the names of backing indices with this template.
      index_patterns: [name + '*'],
      template: {
        mappings: {
          properties: {
            '@timestamp': {
              type: 'date',
            },
          },
        },
        settings: {
          index: {
            mode: indexMode,
          },
        },
        lifecycle: {
          enabled: true,
        },
      },
      data_stream: {},
    });

    await es.indices.createDataStream({ name });
  };
  const deleteComposableIndexTemplate = async (es: Client, name: string) => {
    await es.indices.deleteIndexTemplate({ name });
  };
  const deleteDataStream = async (es: Client, name: string) => {
    await es.indices.deleteDataStream({ name });
    await deleteComposableIndexTemplate(es, name);
  };
  describe('Get', () => {
    const testDataStreamName = 'test-data-stream';

    apiTest(
      'returns an array of data streams',
      async ({ es, expect, supertest, onTestFailed, onTestFinished }) => {
        await createDataStream(es, testDataStreamName);

        onTestFinished(async () => await deleteDataStream(es, testDataStreamName));
        onTestFailed(async () => await deleteDataStream(es, testDataStreamName));

        const { body: dataStreams } = await supertest
          .get(`${API_BASE_PATH}/data_streams`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        expectTypeOf(dataStreams as []).toBeArray();

        // returned array can contain automatically created data streams
        const testDataStream = dataStreams.find(
          (dataStream: DataStream) => dataStream.name === testDataStreamName
        );

        expect(testDataStream).toBeTruthy();

        // ES determines these values so we'll just echo them back.
        const { name: indexName, uuid } = testDataStream!.indices[0];

        expect(testDataStream).to.eql({
          name: testDataStreamName,
          lifecycle: {
            enabled: true,
          },
          privileges: {
            delete_index: true,
            manage_data_stream_lifecycle: true,
          },
          timeStampField: { name: '@timestamp' },
          indices: [
            {
              name: indexName,
              uuid,
              preferILM: true,
              managedBy: 'Data stream lifecycle',
            },
          ],
          nextGenerationManagedBy: 'Data stream lifecycle',
          generation: 1,
          health: 'yellow',
          indexTemplateName: testDataStreamName,
          hidden: false,
          indexMode: 'standard',
        });
      }
    );
  });
});
