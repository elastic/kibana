/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import type { CreateAlertActionData } from '../../routes/schemas/alert_action_schema';
import type { QueryService, QueryServiceContract } from '../services/query_service/query_service';
import { createMockQueryService } from '../services/query_service/query_service.mock';
import type {
  StorageService,
  StorageServiceContract,
} from '../services/storage_service/storage_service';
import { createMockStorageService } from '../services/storage_service/storage_service.mock';
import { AlertActionsClient } from './alert_actions_client';
import {
  anAlertEventESQLResponse,
  anAlertTransitionESQLResponse,
  anEmptyESQLResponse,
} from './fixtures/query_responses';

describe('AlertActionsClient', () => {
  let request: KibanaRequest;
  let queryService: jest.Mocked<QueryServiceContract>;
  let storageService: jest.Mocked<StorageServiceContract>;
  let security: SecurityPluginStart;
  let client: AlertActionsClient;
  let executeQueryCallCount: number;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-01-01T11:12:13.000Z'));
    request = httpServerMock.createKibanaRequest();
    queryService = createMockQueryService();
    storageService = createMockStorageService();
    security = securityMock.createStart();

    security.authc.getCurrentUser = jest.fn().mockReturnValue({
      username: 'test-user',
    });

    storageService.bulkIndexDocs.mockResolvedValue(undefined);

    client = new AlertActionsClient(
      request,
      queryService as unknown as QueryService,
      storageService as unknown as StorageService,
      security
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAction', () => {
    const actionData: CreateAlertActionData = {
      action_type: 'ack',
    };

    it('should successfully create an action', async () => {
      queryService.executeQuery
        .mockResolvedValueOnce(anAlertEventESQLResponse())
        .mockResolvedValueOnce(anAlertTransitionESQLResponse());

      await client.createAction({
        alertSeriesId: 'test-series-id',
        action: actionData,
      });

      expect(queryService.executeQuery).toHaveBeenCalledTimes(2);

      expect(storageService.bulkIndexDocs).toHaveBeenCalledTimes(1);
      const callArgs = storageService.bulkIndexDocs.mock.calls[0][0];
      expect(callArgs.index).toBe('.alerts-actions');
      expect(callArgs.docs).toHaveLength(1);
      expect(callArgs.docs[0]).toMatchObject({
        alert_series_id: 'test-series-id',
        action_type: 'ack',
        episode_id: 'episode-1',
        rule_id: 'test-rule-id',
        last_series_event_timestamp: '2025-01-01T00:00:00.000Z',
        actor: 'test-user',
      });
      expect(callArgs.docs[0]).toHaveProperty('@timestamp');
    });

    it('should throw when alert event is not found', async () => {
      queryService.executeQuery
        .mockResolvedValueOnce(anEmptyESQLResponse())
        .mockResolvedValueOnce(anAlertTransitionESQLResponse());

      await expect(
        client.createAction({
          alertSeriesId: 'unknown-series-id',
          action: actionData,
        })
      ).rejects.toThrow('Alert event with series id [unknown-series-id] not found');

      expect(storageService.bulkIndexDocs).not.toHaveBeenCalled();
    });

    it('should throw when alert transition is not found', async () => {
      queryService.executeQuery
        .mockResolvedValueOnce(anAlertEventESQLResponse())
        .mockResolvedValueOnce(anEmptyESQLResponse());

      await expect(
        client.createAction({
          alertSeriesId: 'test-series-id',
          action: actionData,
        })
      ).rejects.toThrow(
        'Alert transition with series id [test-series-id] and optional episode id [undefined] not found'
      );

      expect(storageService.bulkIndexDocs).not.toHaveBeenCalled();
    });

    it('should handle action with episode_id', async () => {
      const actionWithEpisode: CreateAlertActionData = {
        action_type: 'ack',
        episode_id: 'episode-2',
      };

      queryService.executeQuery
        .mockResolvedValueOnce(anAlertEventESQLResponse())
        .mockResolvedValueOnce(anAlertTransitionESQLResponse({ episode_id: 'episode-2' }));

      await client.createAction({
        alertSeriesId: 'test-series-id',
        action: actionWithEpisode,
      });

      expect(storageService.bulkIndexDocs).toHaveBeenCalledTimes(1);
      const callArgs = storageService.bulkIndexDocs.mock.calls[0][0];
      expect(callArgs.docs[0].episode_id).toBe('episode-2');
    });

    it('should handle null username when security is not available', async () => {
      queryService.executeQuery
        .mockResolvedValueOnce(anAlertEventESQLResponse())
        .mockResolvedValueOnce(anAlertTransitionESQLResponse());

      const clientWithoutSecurity = new AlertActionsClient(
        request,
        queryService as unknown as QueryService,
        storageService as unknown as StorageService,
        undefined
      );

      await clientWithoutSecurity.createAction({
        alertSeriesId: 'test-series-id',
        action: actionData,
      });

      expect(storageService.bulkIndexDocs).toHaveBeenCalledTimes(1);
      const callArgs = storageService.bulkIndexDocs.mock.calls[0][0];
      expect(callArgs.docs[0].actor).toBeNull();
    });
  });

  describe('createBulkActions', () => {
    it('should process all actions successfully', async () => {
      const actions = [
        { alert_series_id: 'test-series-id', action_type: 'ack' as const },
        { alert_series_id: 'test-series-id', action_type: 'snooze' as const },
      ];

      queryService.executeQuery
        // first action
        .mockResolvedValueOnce(anAlertEventESQLResponse())
        .mockResolvedValueOnce(anAlertTransitionESQLResponse())
        // second action
        .mockResolvedValueOnce(anAlertEventESQLResponse())
        .mockResolvedValueOnce(anAlertTransitionESQLResponse());

      const result = await client.createBulkActions(actions);

      expect(result).toEqual({ processed: 2, total: 2 });
      expect(storageService.bulkIndexDocs).toHaveBeenCalledTimes(1);
      const callArgs = storageService.bulkIndexDocs.mock.calls[0][0];
      expect(callArgs.docs).toHaveLength(2);
    });

    it('should handle partial failures and return correct counts', async () => {
      const actions = [
        { alert_series_id: 'test-series-id', action_type: 'ack' as const },
        { alert_series_id: 'unknown-series-id', action_type: 'ack' as const },
      ];

      queryService.executeQuery
        // first action
        .mockResolvedValueOnce(anAlertEventESQLResponse())
        .mockResolvedValueOnce(anAlertTransitionESQLResponse())
        // second action
        .mockResolvedValueOnce(anEmptyESQLResponse())
        .mockResolvedValueOnce(anEmptyESQLResponse());

      const result = await client.createBulkActions(actions);

      expect(result).toEqual({ processed: 1, total: 2 });
      expect(storageService.bulkIndexDocs).toHaveBeenCalledTimes(1);
      const callArgs = storageService.bulkIndexDocs.mock.calls[0][0];
      expect(callArgs.docs).toHaveLength(1);
    });

    it('should return processed 0 when all actions fail', async () => {
      const actions = [
        { alert_series_id: 'unknown-1', action_type: 'ack' as const },
        { alert_series_id: 'unknown-2', action_type: 'snooze' as const },
      ];

      queryService.executeQuery.mockResolvedValue({
        columns: [{ name: '@timestamp', type: 'date' }],
        values: [], // Empty values means not found
      });

      const result = await client.createBulkActions(actions);

      expect(result).toEqual({ processed: 0, total: 2 });
      expect(storageService.bulkIndexDocs).not.toHaveBeenCalled();
    });
  });
});
