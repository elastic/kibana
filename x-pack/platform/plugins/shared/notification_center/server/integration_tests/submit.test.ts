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
import { NOTIFICATION_TYPES } from '../../common';
import {
  NOTIFICATION_DATA_STREAM_NAME,
  notificationDataStreamDefinition,
} from '../data_stream/notification_data_stream';
import { buildForType, NotificationValidationError } from '../submit';
import type { NotificationCenterPluginStart, NotificationCenterStartDependencies } from '../types';

const modelStatus = NOTIFICATION_TYPES.inference.modelStatus;

const content = (overrides: Record<string, unknown> = {}) => ({
  entity: 'my-endpoint',
  state: 'deprecated',
  title: 'Model deprecated',
  description: 'Your endpoint model is deprecated.',
  ...overrides,
});

describe('notificationCenter forType().submit() [integration]', () => {
  let esServer: EsTestCluster;
  let forType: ReturnType<typeof buildForType>;
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

    // submit resolves its client via core.getStartServices().dataStreams,
    // so mock the start service to return the test client bound to the test ES cluster.
    const dataStreams = { initializeClient: async () => client } as unknown as DataStreamsStart;
    const featureFlags = { getBooleanValue: async () => true };
    const core = {
      getStartServices: async () => [{ dataStreams, featureFlags }],
    } as unknown as CoreSetup<NotificationCenterStartDependencies, NotificationCenterPluginStart>;
    forType = buildForType(core);
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  it('lands one document, building the id from the type + id parts and defaulting severity', async () => {
    await forType(modelStatus).submit(content({ entity: 'endpoint-a' }));

    const notificationId = 'inference:modelStatus:endpoint-a:deprecated';
    const hits = await countById(notificationId);
    expect(hits).toHaveLength(1);
    const source = hits[0]._source as Record<string, unknown>;
    expect(source.notification_id).toBe(notificationId);
    expect(source.namespace).toBe('inference');
    expect(source.type).toBe('modelStatus');
    expect(source.severity).toBe('info');
    expect(typeof source['@timestamp']).toBe('string');
  });

  it('appends a second document when the same state is re-pushed (no upsert)', async () => {
    await forType(modelStatus).submit(content({ entity: 'endpoint-b' }));
    await forType(modelStatus).submit(content({ entity: 'endpoint-b' }));

    expect(await countById('inference:modelStatus:endpoint-b:deprecated')).toHaveLength(2);
  });

  it('rejects invalid content and writes nothing', async () => {
    await expect(
      forType(modelStatus).submit(content({ entity: 'endpoint-c', title: '' }))
    ).rejects.toBeInstanceOf(NotificationValidationError);

    expect(await countById('inference:modelStatus:endpoint-c:deprecated')).toHaveLength(0);
  });
});
