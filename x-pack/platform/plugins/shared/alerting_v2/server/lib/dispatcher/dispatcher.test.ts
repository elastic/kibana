/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { ALERT_ACTIONS_DATA_STREAM } from '../../resources/alert_actions';
import { createLoggerService } from '../services/logger_service/logger_service.mock';
import type { QueryServiceContract } from '../services/query_service/query_service';
import type { StorageServiceContract } from '../services/storage_service/storage_service';
import { LOOKBACK_WINDOW_MINUTES } from './constants';
import { DispatcherService } from './dispatcher';
import { createDispatchableAlertEventsResponse } from './fixtures/dispatcher';
import { getDispatchableAlertEventsQuery } from './queries';
import type { AlertEpisode } from './types';

describe('DispatcherService', () => {
  let dispatcherService: DispatcherService;
  let queryService: jest.Mocked<QueryServiceContract>;
  let storageService: jest.Mocked<StorageServiceContract>;

  beforeEach(() => {
    queryService = { executeQuery: jest.fn() };
    storageService = { bulkIndexDocs: jest.fn() };

    const { loggerService } = createLoggerService();
    dispatcherService = new DispatcherService(queryService, loggerService, storageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('run', () => {
    it('indexes fire-events for dispatchable alert episodes', async () => {
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

      queryService.executeQuery.mockResolvedValue(
        createDispatchableAlertEventsResponse(alertEpisodes)
      );

      const previousStartedAt = new Date('2026-01-22T07:30:00.000Z');

      const result = await dispatcherService.run({
        previousStartedAt,
      });

      expect(result.startedAt).toBeInstanceOf(Date);

      const expectedLookback = moment(previousStartedAt)
        .subtract(LOOKBACK_WINDOW_MINUTES, 'minutes')
        .toISOString();

      expect(queryService.executeQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          query: getDispatchableAlertEventsQuery().query,
          filter: {
            range: {
              '@timestamp': {
                gte: expectedLookback,
              },
            },
          },
        })
      );

      expect(storageService.bulkIndexDocs).toHaveBeenCalledWith({
        index: ALERT_ACTIONS_DATA_STREAM,
        docs: expect.any(Array),
      });

      const [{ docs }] = storageService.bulkIndexDocs.mock.calls[0];
      expect(docs).toHaveLength(alertEpisodes.length);

      expect(docs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            group_hash: 'hash-1',
            last_series_event_timestamp: '2026-01-22T07:10:00.000Z',
            actor: 'system',
            action_type: 'fire-event',
            rule_id: 'rule-1',
            source: 'internal',
          }),
          expect.objectContaining({
            group_hash: 'hash-2',
            last_series_event_timestamp: '2026-01-22T07:15:00.000Z',
            actor: 'system',
            action_type: 'fire-event',
            rule_id: 'rule-2',
            source: 'internal',
          }),
        ])
      );
    });

    it('handles empty alert episode responses', async () => {
      queryService.executeQuery.mockResolvedValue(createDispatchableAlertEventsResponse([]));

      const result = await dispatcherService.run({
        previousStartedAt: new Date('2026-01-22T07:30:00.000Z'),
      });

      expect(result.startedAt).toBeInstanceOf(Date);
      expect(storageService.bulkIndexDocs).toHaveBeenCalledWith({
        index: ALERT_ACTIONS_DATA_STREAM,
        docs: [],
      });
    });
  });
});
