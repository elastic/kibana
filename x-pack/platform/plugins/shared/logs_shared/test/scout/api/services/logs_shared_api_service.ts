/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, KbnClient, ScoutLogger } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';
import type { LogViewAttributes } from '../../../../common/log_views';
import { DOCUMENT_COUNT, START_TIMESTAMP } from '../fixtures/log_entries';

export interface LogsSharedApiService {
  /** Creates an index holding `DOCUMENT_COUNT` log documents inside the test time range. */
  createLogIndex: (index: string) => Promise<void>;
  deleteLogIndex: (index: string) => Promise<void>;
  /** Stores a log view saved object. Not available in Serverless. */
  putLogView: (logViewId: string, attributes: LogViewAttributes) => Promise<void>;
  deleteLogView: (logViewId: string) => Promise<void>;
}

export const getLogsSharedApiService = ({
  esClient,
  kbnClient,
  log,
}: {
  esClient: EsClient;
  kbnClient: KbnClient;
  log: ScoutLogger;
}): LogsSharedApiService => ({
  createLogIndex: (index) =>
    measurePerformanceAsync(log, 'logsShared.createLogIndex', async () => {
      await esClient.indices.create({
        index,
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            message: { type: 'text' },
            'event.dataset': { type: 'keyword' },
          },
        },
      });
      await esClient.bulk({
        refresh: 'wait_for',
        operations: Array.from({ length: DOCUMENT_COUNT }, (_, position) => [
          { index: { _index: index } },
          {
            '@timestamp': new Date(START_TIMESTAMP + (position + 1) * 60_000).toISOString(),
            message: `log message ${position}`,
            'event.dataset': 'scout.log',
          },
        ]).flat(),
      });
    }),

  deleteLogIndex: (index) =>
    measurePerformanceAsync(log, 'logsShared.deleteLogIndex', async () => {
      await esClient.indices.delete({ index, ignore_unavailable: true });
    }),

  putLogView: (logViewId, attributes) =>
    measurePerformanceAsync(log, 'logsShared.putLogView', async () => {
      await kbnClient.request({
        method: 'PUT',
        path: `/api/infra/log_views/${encodeURIComponent(logViewId)}`,
        headers: { 'elastic-api-version': '1', 'x-elastic-internal-origin': 'kibana' },
        body: { attributes },
        retries: 3,
      });
    }),

  deleteLogView: (logViewId) =>
    measurePerformanceAsync(log, 'logsShared.deleteLogView', async () => {
      await kbnClient.savedObjects.delete({
        type: 'infrastructure-monitoring-log-view',
        id: logViewId,
      });
    }),
});
