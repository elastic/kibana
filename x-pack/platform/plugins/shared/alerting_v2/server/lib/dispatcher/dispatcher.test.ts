/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import type { DeeplyMockedApi } from '@kbn/core-elasticsearch-client-server-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import moment from 'moment';
import { ALERT_ACTIONS_DATA_STREAM } from '../../resources/alert_actions';
import { createLoggerService } from '../services/logger_service/logger_service.mock';
import type { QueryServiceContract } from '../services/query_service/query_service';
import { createQueryService } from '../services/query_service/query_service.mock';
import type { StorageServiceContract } from '../services/storage_service/storage_service';
import { createStorageService } from '../services/storage_service/storage_service.mock';
import { LOOKBACK_WINDOW_MINUTES } from './constants';
import { DispatcherService } from './dispatcher';
import {
  createAlertEpisodeSuppressionsResponse,
  createDispatchableAlertEventsResponse,
} from './fixtures/dispatcher';
import { getDispatchableAlertEventsQuery } from './queries';
import type { AlertEpisode, AlertEpisodeSuppression } from './types';

describe('DispatcherService', () => {
  let dispatcherService: DispatcherService;
  let queryService: QueryServiceContract;
  let storageService: StorageServiceContract;
  let queryEsClient: DeeplyMockedApi<ElasticsearchClient>;
  let storageEsClient: jest.Mocked<ElasticsearchClient>;

  beforeEach(() => {
    ({ queryService, mockEsClient: queryEsClient } = createQueryService());
    ({ storageService, mockEsClient: storageEsClient } = createStorageService());
    const { loggerService } = createLoggerService();
    dispatcherService = new DispatcherService(queryService, loggerService, storageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('run', () => {
    it('indexes fire actions for dispatchable alert episodes when no suppressions exist', async () => {
      const alertEpisodes: AlertEpisode[] = [
        {
          last_event_timestamp: '2026-01-22T07:10:00.000Z',
          rule_id: 'rule-1',
          group_hash: 'hash-1',
          episode_id: 'episode-1',
          episode_status: 'active',
        },
        {
          last_event_timestamp: '2026-01-22T07:15:00.000Z',
          rule_id: 'rule-2',
          group_hash: 'hash-2',
          episode_id: 'episode-2',
          episode_status: 'inactive',
        },
      ];

      const suppressions: AlertEpisodeSuppression[] = [
        {
          rule_id: 'rule-1',
          group_hash: 'hash-1',
          episode_id: 'episode-1',
          should_suppress: false,
        },
        {
          rule_id: 'rule-2',
          group_hash: 'hash-2',
          episode_id: 'episode-2',
          should_suppress: false,
        },
      ];

      queryEsClient.esql.query
        .mockResolvedValueOnce(createDispatchableAlertEventsResponse(alertEpisodes))
        .mockResolvedValueOnce(createAlertEpisodeSuppressionsResponse(suppressions));

      storageEsClient.bulk.mockResolvedValue({
        items: [{ create: { _id: '1', status: 201 } }, { create: { _id: '2', status: 201 } }],
        errors: false,
      } as BulkResponse);

      const previousStartedAt = new Date('2026-01-22T07:30:00.000Z');

      const result = await dispatcherService.run({
        previousStartedAt,
      });

      expect(result.startedAt).toBeInstanceOf(Date);

      const expectedLookback = moment(previousStartedAt)
        .subtract(LOOKBACK_WINDOW_MINUTES, 'minutes')
        .toISOString();

      expect(queryEsClient.esql.query).toHaveBeenCalledTimes(2);
      expect(queryEsClient.esql.query).toHaveBeenCalledWith(
        {
          query: getDispatchableAlertEventsQuery().query,
          drop_null_columns: false,
          filter: {
            range: {
              '@timestamp': {
                gte: expectedLookback,
              },
            },
          },
          params: undefined,
        },
        { signal: undefined }
      );

      expect(storageEsClient.bulk).toHaveBeenCalledWith({
        operations: expect.any(Array),
        refresh: 'wait_for',
      });

      const [{ operations }] = storageEsClient.bulk.mock.calls[0];
      const safeOperations = operations ?? [];
      const createOperations = safeOperations.filter((_, index) => index % 2 === 0);
      const docs = safeOperations.filter((_, index) => index % 2 === 1);
      expect(createOperations).toEqual(
        expect.arrayContaining([{ create: { _index: ALERT_ACTIONS_DATA_STREAM } }])
      );
      expect(docs).toHaveLength(alertEpisodes.length);

      expect(docs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            group_hash: 'hash-1',
            last_series_event_timestamp: '2026-01-22T07:10:00.000Z',
            actor: 'system',
            action_type: 'fire',
            rule_id: 'rule-1',
            source: 'internal',
          }),
          expect.objectContaining({
            group_hash: 'hash-2',
            last_series_event_timestamp: '2026-01-22T07:15:00.000Z',
            actor: 'system',
            action_type: 'fire',
            rule_id: 'rule-2',
            source: 'internal',
          }),
        ])
      );
    });

    it('indexes suppress actions for suppressed alert episodes', async () => {
      const alertEpisodes: AlertEpisode[] = [
        {
          last_event_timestamp: '2026-01-22T07:10:00.000Z',
          rule_id: 'rule-1',
          group_hash: 'hash-1',
          episode_id: 'episode-1',
          episode_status: 'active',
        },
        {
          last_event_timestamp: '2026-01-22T07:15:00.000Z',
          rule_id: 'rule-2',
          group_hash: 'hash-2',
          episode_id: 'episode-2',
          episode_status: 'active',
        },
      ];

      const suppressions: AlertEpisodeSuppression[] = [
        {
          rule_id: 'rule-1',
          group_hash: 'hash-1',
          episode_id: 'episode-1',
          should_suppress: true,
        },
        {
          rule_id: 'rule-2',
          group_hash: 'hash-2',
          episode_id: 'episode-2',
          should_suppress: false,
        },
      ];

      queryEsClient.esql.query
        .mockResolvedValueOnce(createDispatchableAlertEventsResponse(alertEpisodes))
        .mockResolvedValueOnce(createAlertEpisodeSuppressionsResponse(suppressions));

      storageEsClient.bulk.mockResolvedValue({
        items: [{ create: { _id: '1', status: 201 } }, { create: { _id: '2', status: 201 } }],
        errors: false,
      } as BulkResponse);

      const result = await dispatcherService.run({
        previousStartedAt: new Date('2026-01-22T07:30:00.000Z'),
      });

      expect(result.startedAt).toBeInstanceOf(Date);

      const [{ operations }] = storageEsClient.bulk.mock.calls[0];
      const safeOperations = operations ?? [];
      const docs = safeOperations.filter((_, index) => index % 2 === 1);
      expect(docs).toHaveLength(2);

      expect(docs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            group_hash: 'hash-1',
            last_series_event_timestamp: '2026-01-22T07:10:00.000Z',
            actor: 'system',
            action_type: 'suppress',
            rule_id: 'rule-1',
            source: 'internal',
          }),
          expect.objectContaining({
            group_hash: 'hash-2',
            last_series_event_timestamp: '2026-01-22T07:15:00.000Z',
            actor: 'system',
            action_type: 'fire',
            rule_id: 'rule-2',
            source: 'internal',
          }),
        ])
      );
    });

    it('handles empty alert episode responses', async () => {
      queryEsClient.esql.query.mockResolvedValue(createDispatchableAlertEventsResponse([]));

      const result = await dispatcherService.run({
        previousStartedAt: new Date('2026-01-22T07:30:00.000Z'),
      });

      expect(result.startedAt).toBeInstanceOf(Date);
      expect(queryEsClient.esql.query).toHaveBeenCalledTimes(1);
      expect(storageEsClient.bulk).not.toHaveBeenCalled();
    });
  });
});
