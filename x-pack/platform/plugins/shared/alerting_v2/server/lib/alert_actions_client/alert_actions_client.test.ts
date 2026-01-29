/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { of } from 'rxjs';
import type { CreateAlertActionBody } from '../../routes/schemas/alert_action_schema';
import type { QueryService } from '../services/query_service/query_service';
import { createQueryService } from '../services/query_service/query_service.mock';
import type { StorageService } from '../services/storage_service/storage_service';
import { createStorageService } from '../services/storage_service/storage_service.mock';
import { AlertActionsClient } from './alert_actions_client';
import {
  aBulkAlertEventsESQLResponse,
  anAlertEventESQLResponse,
  anEmptyESQLResponse,
} from './fixtures/query_responses';

describe('AlertActionsClient', () => {
  jest.useFakeTimers().setSystemTime(new Date('2025-01-01T11:12:13.000Z'));
  const request = httpServerMock.createKibanaRequest();
  const { queryService, mockSearchClient: queryServiceSearchClient } = createQueryService();
  const { storageService, mockEsClient: storageServiceEsClient } = createStorageService();
  const security = securityMock.createStart();
  let client: AlertActionsClient;

  beforeEach(() => {
    security.authc.getCurrentUser = jest.fn().mockReturnValue({ username: 'test-user' });
    storageServiceEsClient.bulk.mockResolvedValueOnce({ items: [], errors: false, took: 1 });
    client = new AlertActionsClient(request, queryService, storageService, security);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAction', () => {
    const actionData: CreateAlertActionBody = {
      action_type: 'ack',
      episode_id: 'episode-1',
    };

    it('should successfully create an action', async () => {
      queryServiceSearchClient.search.mockReturnValue(
        of({ rawResponse: anAlertEventESQLResponse() })
      );

      await client.createAction({
        groupHash: 'test-group-hash',
        action: actionData,
      });

      expect(storageServiceEsClient.bulk).toHaveBeenCalledTimes(1);
      const callArgs = storageServiceEsClient.bulk.mock.calls[0][0];
      expect(callArgs.index).toBe('.alerts-actions');
      expect(callArgs.docs).toHaveLength(1);
      expect(callArgs.docs[0]).toMatchObject({
        group_hash: 'test-group-hash',
        action_type: 'ack',
        episode_id: 'episode-1',
        rule_id: 'test-rule-id',
        last_series_event_timestamp: '2025-01-01T00:00:00.000Z',
        actor: 'test-user',
      });
      expect(callArgs.docs[0]).toHaveProperty('@timestamp');
    });

    it('should throw when alert event is not found', async () => {
      queryService.executeQuery.mockResolvedValueOnce(anEmptyESQLResponse());

      await expect(
        client.createAction({
          groupHash: 'unknown-group-hash',
          action: actionData,
        })
      ).rejects.toThrow(
        'Alert event with group_hash [unknown-group-hash] and episode_id [episode-1] not found'
      );

      expect(storageService.bulkIndexDocs).not.toHaveBeenCalled();
    });

    it('should handle action with episode_id', async () => {
      const actionWithEpisode: CreateAlertActionBody = {
        action_type: 'ack',
        episode_id: 'episode-2',
      };

      queryService.executeQuery.mockResolvedValueOnce(
        anAlertEventESQLResponse({ episode_id: 'episode-2' })
      );

      await client.createAction({
        groupHash: 'test-group-hash',
        action: actionWithEpisode,
      });

      expect(storageService.bulkIndexDocs).toHaveBeenCalledTimes(1);
      const callArgs = storageService.bulkIndexDocs.mock.calls[0][0];
      expect(callArgs.docs[0].episode_id).toBe('episode-2');
    });

    it('should handle null username when security is not available', async () => {
      queryService.executeQuery.mockResolvedValueOnce(anAlertEventESQLResponse());

      const clientWithoutSecurity = new AlertActionsClient(
        request,
        queryService as unknown as QueryService,
        storageService as unknown as StorageService,
        undefined
      );

      await clientWithoutSecurity.createAction({
        groupHash: 'test-group-hash',
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
        { group_hash: 'group-hash-1', action_type: 'ack' as const, episode_id: 'episode-1' },
        { group_hash: 'group-hash-2', action_type: 'snooze' as const },
      ];

      queryService.executeQuery.mockResolvedValueOnce(
        aBulkAlertEventsESQLResponse([
          { group_hash: 'group-hash-1', episode_id: 'episode-1' },
          { group_hash: 'group-hash-2', episode_id: 'episode-2' },
        ])
      );

      const result = await client.createBulkActions(actions);

      expect(result).toEqual({ processed: 2, total: 2 });
      expect(queryService.executeQuery).toHaveBeenCalledTimes(1);
      expect(storageService.bulkIndexDocs).toHaveBeenCalledTimes(1);
      const callArgs = storageService.bulkIndexDocs.mock.calls[0][0];
      expect(callArgs.docs).toHaveLength(2);
    });

    it('should handle partial failures and return correct counts', async () => {
      const actions = [
        { group_hash: 'group-hash-1', action_type: 'ack' as const, episode_id: 'episode-1' },
        { group_hash: 'unknown-group-hash', action_type: 'ack' as const, episode_id: 'episode-1' },
      ];

      // Only return one matching alert event (the second action's group_hash won't match)
      queryService.executeQuery.mockResolvedValueOnce(
        aBulkAlertEventsESQLResponse([{ group_hash: 'group-hash-1', episode_id: 'episode-1' }])
      );

      const result = await client.createBulkActions(actions);

      expect(result).toEqual({ processed: 1, total: 2 });
      expect(queryService.executeQuery).toHaveBeenCalledTimes(1);
      expect(storageService.bulkIndexDocs).toHaveBeenCalledTimes(1);
      const callArgs = storageService.bulkIndexDocs.mock.calls[0][0];
      expect(callArgs.docs).toHaveLength(1);
    });

    it('should return processed 0 when all actions fail', async () => {
      const actions = [
        { group_hash: 'unknown-1', action_type: 'ack' as const, episode_id: 'episode-1' },
        { group_hash: 'unknown-2', action_type: 'snooze' as const },
      ];

      // Return empty response - no matching alert events
      queryService.executeQuery.mockResolvedValueOnce(aBulkAlertEventsESQLResponse([]));

      const result = await client.createBulkActions(actions);

      expect(result).toEqual({ processed: 0, total: 2 });
      expect(queryService.executeQuery).toHaveBeenCalledTimes(1);
      expect(storageService.bulkIndexDocs).not.toHaveBeenCalled();
    });
  });
});
