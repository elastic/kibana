/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStreamsStart } from '@kbn/core-data-streams-server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { DataStreamClient } from '@kbn/data-streams';
import type { EsTestCluster } from '@kbn/test';
import { createTestEsCluster } from '@kbn/test';
import { ToolingLog } from '@kbn/tooling-log';
import type { NotificationDocument } from '../../common/types';
import {
  NOTIFICATION_DATA_STREAM_NAME,
  notificationDataStreamDefinition,
} from '../storage/notification_data_stream';
import { queryNotifications } from '../lib/query_notifications';

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

const doc = (
  id: string,
  timestamp: string,
  overrides: Partial<NotificationDocument> = {}
): NotificationDocument => ({
  '@timestamp': timestamp,
  notification_id: id,
  namespace: 'inference',
  type: 'modelStatus',
  title: `Title for ${id}`,
  description: `Description for ${id}`,
  severity: 'info',
  ...overrides,
});

describe('queryNotifications [integration]', () => {
  let esServer: EsTestCluster;
  let dataStreams: DataStreamsStart;
  const logger = loggingSystemMock.createLogger();

  const query = (params: Parameters<typeof queryNotifications>[1] = {}) =>
    queryNotifications({ dataStreams, logger }, params);

  beforeAll(async () => {
    jest.setTimeout(120_000);
    esServer = createTestEsCluster({
      log: new ToolingLog({ writeTo: process.stdout, level: 'error' }),
    });
    await esServer.start();
    const esClient = esServer.getClient();

    const client = await DataStreamClient.initialize({
      logger: loggingSystemMock.createLogger(),
      elasticsearchClient: esClient,
      dataStream: notificationDataStreamDefinition,
    });
    if (!client) {
      throw new Error('Failed to initialize the notification data stream client');
    }
    dataStreams = { initializeClient: async () => client } as unknown as DataStreamsStart;

    await client.create({
      documents: [
        // re-pushed id: collapse must surface only the latest doc
        doc('dup', daysAgo(5), { title: 'dup v1' }),
        doc('dup', daysAgo(2), { title: 'dup v2' }),
        // past the 30d info TTL: horizon-excluded
        doc('old-info', daysAgo(40)),
        // same age but error tier (180d TTL): visible
        doc('old-error', daysAgo(40), { severity: 'error' }),
        doc('recent-warning', daysAgo(1), { severity: 'warning' }),
        doc('other-type', daysAgo(3), { type: 'other' }),
      ],
    });
    await esClient.indices.refresh({ index: NOTIFICATION_DATA_STREAM_NAME });
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  it('returns each notification_id once, represented by its latest doc, newest first', async () => {
    const { items, truncated } = await query();

    expect(items.map(({ notification_id: id }) => id)).toEqual([
      'recent-warning',
      'dup',
      'other-type',
      'old-error',
    ]);
    expect(items.find(({ notification_id: id }) => id === 'dup')?.title).toBe('dup v2');
    expect(truncated).toBe(false);
  });

  it('excludes docs past their severity TTL while keeping longer-lived tiers of the same age', async () => {
    const { items } = await query();

    const ids = items.map(({ notification_id: id }) => id);
    expect(ids).not.toContain('old-info');
    expect(ids).toContain('old-error');
  });

  it('composes attribute filters', async () => {
    const bySeverity = await query({ severity: ['error'] });
    expect(bySeverity.items.map(({ notification_id: id }) => id)).toEqual(['old-error']);

    const byType = await query({ type: 'other' });
    expect(byType.items.map(({ notification_id: id }) => id)).toEqual(['other-type']);

    const byNamespace = await query({ namespace: 'nonexistent' });
    expect(byNamespace.items).toEqual([]);
  });
});
