/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import type { DataStreamsStart } from '@kbn/core-data-streams-server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { DataStreamClient } from '@kbn/data-streams';
import type { EsTestCluster } from '@kbn/test';
import { createTestEsCluster } from '@kbn/test';
import { ToolingLog } from '@kbn/tooling-log';
import type { NotificationInput } from '../../common/types';
import {
  NOTIFICATION_DATA_STREAM_NAME,
  notificationDataStreamDefinition,
} from '../data_stream/notification_data_stream';
import { buildSubmitNotification, NotificationValidationError } from '../submit';
import type { NotificationCenterPluginStart, NotificationCenterStartDependencies } from '../types';

const draft = (overrides: Partial<NotificationInput> = {}): NotificationInput => ({
  notification_id: 'inference:my-endpoint:deprecated',
  event_timestamp: '2026-07-09T12:00:00.000Z',
  type: 'modelStatus',
  title: 'Model deprecated',
  description: 'Your endpoint model is deprecated.',
  source_app_id: 'inference',
  ...overrides,
});

describe('notificationCenter submit() [integration]', () => {
  let esServer: EsTestCluster;
  let submit: (input: NotificationInput) => Promise<void>;
  let esClient: ReturnType<EsTestCluster['getClient']>;

  const countById = async (notificationId: string) => {
    await esClient.indices.refresh({ index: NOTIFICATION_DATA_STREAM_NAME });
    const { hits } = await esClient.search({
      index: NOTIFICATION_DATA_STREAM_NAME,
      query: { term: { notification_id: notificationId } },
      size: 10,
    });
    return hits.hits;
  };

  beforeAll(async () => {
    jest.setTimeout(120_000);
    esServer = createTestEsCluster({
      log: new ToolingLog({ writeTo: process.stdout, level: 'error' }),
    });
    await esServer.start();
    esClient = esServer.getClient();

    const client = await DataStreamClient.initialize({
      logger: loggingSystemMock.createLogger(),
      elasticsearchClient: esClient,
      dataStream: notificationDataStreamDefinition,
    });
    if (!client) {
      throw new Error('Failed to initialize the notification data stream client');
    }

    // submit() resolves its client via core.getStartServices().dataStreams;
    // mock the start service to return the test client bound to the test ES cluster.
    const dataStreams = { initializeClient: async () => client } as unknown as DataStreamsStart;
    const core = { getStartServices: async () => [{ dataStreams }] } as unknown as CoreSetup<
      NotificationCenterStartDependencies,
      NotificationCenterPluginStart
    >;
    submit = buildSubmitNotification(core);
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  it('lands one document, storing the consumer-provided id and defaulted severity verbatim', async () => {
    const notificationId = 'inference:endpoint-a:deprecated';
    await submit(draft({ notification_id: notificationId }));

    const hits = await countById(notificationId);
    expect(hits).toHaveLength(1);
    const source = hits[0]._source as Record<string, unknown>;
    expect(source.notification_id).toBe(notificationId);
    expect(source.source_app_id).toBe('inference');
    expect(source.severity).toBe('info');
    expect(typeof source['@timestamp']).toBe('string');
  });

  it('appends a second document when the same id is re-pushed (no upsert)', async () => {
    const notificationId = 'inference:endpoint-b:deprecated';
    await submit(draft({ notification_id: notificationId }));
    await submit(draft({ notification_id: notificationId }));

    expect(await countById(notificationId)).toHaveLength(2);
  });

  it('rejects an invalid draft and writes nothing', async () => {
    const notificationId = 'inference:endpoint-c:deprecated';
    await expect(
      submit(draft({ notification_id: notificationId, event_timestamp: 'not-a-date' }))
    ).rejects.toBeInstanceOf(NotificationValidationError);

    expect(await countById(notificationId)).toHaveLength(0);
  });
});
