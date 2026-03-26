/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfileServiceStart } from '@kbn/core-user-profile-server';
import type { UserService } from '../services/user_service/user_service';
import type { CreateAlertActionBody } from '@kbn/alerting-v2-schemas';
import { createQueryService } from '../services/query_service/query_service.mock';
import { createStorageService } from '../services/storage_service/storage_service.mock';
import { createUserProfile, createUserService } from '../services/user_service/user_service.mock';
import { AlertActionsClient } from './alert_actions_client';
import {
  getBulkAlertEventsESQLResponse,
  getBulkGetAlertActionsESQLResponse,
  getAlertEventESQLResponse,
  getEmptyESQLResponse,
} from './fixtures/query_responses';

describe('AlertActionsClient', () => {
  jest.useFakeTimers().setSystemTime(new Date('2025-01-01T11:12:13.000Z'));
  const { queryService, mockEsClient: queryServiceEsClient } = createQueryService();
  const { storageService, mockEsClient: storageServiceEsClient } = createStorageService();
  let userService: UserService;
  let userProfile: jest.Mocked<UserProfileServiceStart>;
  let client: AlertActionsClient;

  beforeEach(() => {
    ({ userService, userProfile } = createUserService());
    userProfile.getCurrent.mockResolvedValue(createUserProfile('test-uid'));
    storageServiceEsClient.bulk.mockResolvedValueOnce({ items: [], errors: false, took: 1 });
    client = new AlertActionsClient(queryService, storageService, userService);
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
      queryServiceEsClient.esql.query.mockResolvedValueOnce(getAlertEventESQLResponse());

      await client.createAction({
        groupHash: 'test-group-hash',
        action: actionData,
      });

      expect(storageServiceEsClient.bulk).toHaveBeenCalledTimes(1);
      const callArgs = storageServiceEsClient.bulk.mock.calls[0][0];
      const operations = callArgs.operations ?? [];
      const docs = operations.filter((_, index) => index % 2 === 1);
      expect(operations).toHaveLength(2);
      expect(operations[0]).toEqual({ create: { _index: '.alert-actions' } });
      expect(docs).toHaveLength(1);
      expect(docs[0]).toMatchObject({
        group_hash: 'test-group-hash',
        action_type: 'ack',
        episode_id: 'episode-1',
        rule_id: 'test-rule-id',
        last_series_event_timestamp: '2025-01-01T00:00:00.000Z',
        actor: 'test-uid',
      });
      expect(docs[0]).toHaveProperty('@timestamp');
    });

    it('should throw when alert event is not found', async () => {
      queryServiceEsClient.esql.query.mockResolvedValueOnce(getEmptyESQLResponse());

      await expect(
        client.createAction({
          groupHash: 'unknown-group-hash',
          action: actionData,
        })
      ).rejects.toThrow(
        'Alert event with group_hash [unknown-group-hash] and episode_id [episode-1] not found'
      );

      expect(storageServiceEsClient.bulk).not.toHaveBeenCalled();
    });

    it('should handle action with episode_id', async () => {
      const actionWithEpisode: CreateAlertActionBody = {
        action_type: 'ack',
        episode_id: 'episode-2',
      };

      queryServiceEsClient.esql.query.mockResolvedValueOnce(
        getAlertEventESQLResponse({ episode_id: 'episode-2' })
      );

      await client.createAction({
        groupHash: 'test-group-hash',
        action: actionWithEpisode,
      });

      expect(storageServiceEsClient.bulk).toHaveBeenCalledTimes(1);
      const callArgs = storageServiceEsClient.bulk.mock.calls[0][0];
      const operations = callArgs.operations ?? [];
      const docs = operations.filter((_, index) => index % 2 === 1);
      expect(docs[0]).toMatchObject({ episode_id: 'episode-2' });
    });

    it('should handle action with tags', async () => {
      const tagAction: CreateAlertActionBody = {
        action_type: 'tag',
        tags: ['critical', 'network'],
      };

      queryServiceEsClient.esql.query.mockResolvedValueOnce(getAlertEventESQLResponse());

      await client.createAction({
        groupHash: 'test-group-hash',
        action: tagAction,
      });

      expect(storageServiceEsClient.bulk).toHaveBeenCalledTimes(1);
      const callArgs = storageServiceEsClient.bulk.mock.calls[0][0];
      const operations = callArgs.operations ?? [];
      const docs = operations.filter((_, index) => index % 2 === 1);
      expect(docs).toHaveLength(1);
      expect(docs[0]).toMatchObject({
        group_hash: 'test-group-hash',
        action_type: 'tag',
        tags: ['critical', 'network'],
        rule_id: 'test-rule-id',
        actor: 'test-uid',
      });
    });

    it('should handle null profile uid when security is not available', async () => {
      queryServiceEsClient.esql.query.mockResolvedValueOnce(getAlertEventESQLResponse());

      userProfile.getCurrent.mockResolvedValueOnce(null);
      const clientWithoutSecurity = new AlertActionsClient(
        queryService,
        storageService,
        userService
      );

      await clientWithoutSecurity.createAction({
        groupHash: 'test-group-hash',
        action: actionData,
      });

      expect(storageServiceEsClient.bulk).toHaveBeenCalledTimes(1);
      const callArgs = storageServiceEsClient.bulk.mock.calls[0][0];
      const operations = callArgs.operations ?? [];
      const docs = operations.filter((_, index) => index % 2 === 1);
      expect(docs[0]).toMatchObject({ actor: null });
    });
  });

  describe('createBulkActions', () => {
    it('should process all actions successfully', async () => {
      const actions = [
        { group_hash: 'group-hash-1', action_type: 'ack' as const, episode_id: 'episode-1' },
        { group_hash: 'group-hash-2', action_type: 'snooze' as const },
      ];

      queryServiceEsClient.esql.query.mockResolvedValueOnce(
        getBulkAlertEventsESQLResponse([
          { group_hash: 'group-hash-1', episode_id: 'episode-1' },
          { group_hash: 'group-hash-2', episode_id: 'episode-2' },
        ])
      );

      const result = await client.createBulkActions(actions);

      expect(result).toEqual({ processed: 2, total: 2 });
      expect(storageServiceEsClient.bulk).toHaveBeenCalledTimes(1);
      const callArgs = storageServiceEsClient.bulk.mock.calls[0][0];
      const operations = callArgs.operations ?? [];
      const docs = operations.filter((_, index) => index % 2 === 1);
      expect(docs).toHaveLength(2);
    });

    it('should handle partial failures and return correct counts', async () => {
      const actions = [
        { group_hash: 'group-hash-1', action_type: 'ack' as const, episode_id: 'episode-1' },
        { group_hash: 'unknown-group-hash', action_type: 'ack' as const, episode_id: 'episode-1' },
      ];

      queryServiceEsClient.esql.query.mockResolvedValueOnce(
        getBulkAlertEventsESQLResponse([{ group_hash: 'group-hash-1', episode_id: 'episode-1' }])
      );

      const result = await client.createBulkActions(actions);

      expect(result).toEqual({ processed: 1, total: 2 });
      expect(storageServiceEsClient.bulk).toHaveBeenCalledTimes(1);
      const callArgs = storageServiceEsClient.bulk.mock.calls[0][0];
      const operations = callArgs.operations ?? [];
      const docs = operations.filter((_, index) => index % 2 === 1);
      expect(docs).toHaveLength(1);
    });

    it('should return processed 0 when all actions fail', async () => {
      const actions = [
        { group_hash: 'unknown-1', action_type: 'ack' as const, episode_id: 'episode-1' },
        { group_hash: 'unknown-2', action_type: 'snooze' as const },
      ];

      queryServiceEsClient.esql.query.mockResolvedValueOnce(getBulkAlertEventsESQLResponse([]));

      const result = await client.createBulkActions(actions);

      expect(result).toEqual({ processed: 0, total: 2 });
      expect(storageServiceEsClient.bulk).not.toHaveBeenCalled();
    });
  });

  describe('bulkGet', () => {
    it('should return action states for multiple episode IDs', async () => {
      queryServiceEsClient.esql.query.mockResolvedValueOnce(
        getBulkGetAlertActionsESQLResponse([
          {
            episode_id: 'episode-1',
            rule_id: 'rule-1',
            group_hash: 'hash-1',
            last_ack_action: 'ack',
            last_snooze_action: 'snooze',
          },
          {
            episode_id: 'episode-2',
            rule_id: 'rule-2',
            group_hash: 'hash-2',
            last_deactivate_action: 'deactivate',
          },
        ])
      );

      const result = await client.bulkGet(['episode-1', 'episode-2']);

      expect(result).toEqual([
        {
          episode_id: 'episode-1',
          rule_id: 'rule-1',
          group_hash: 'hash-1',
          last_ack_action: 'ack',
          last_deactivate_action: null,
          last_snooze_action: 'snooze',
          tags: null,
        },
        {
          episode_id: 'episode-2',
          rule_id: 'rule-2',
          group_hash: 'hash-2',
          last_ack_action: null,
          last_deactivate_action: 'deactivate',
          last_snooze_action: null,
          tags: null,
        },
      ]);
    });

    it('should return default records with nulls for episodes without actions', async () => {
      queryServiceEsClient.esql.query.mockResolvedValueOnce(getEmptyESQLResponse());

      const result = await client.bulkGet(['unknown-episode']);

      expect(result).toEqual([
        {
          episode_id: 'unknown-episode',
          rule_id: null,
          group_hash: null,
          last_ack_action: null,
          last_deactivate_action: null,
          last_snooze_action: null,
          tags: null,
        },
      ]);
    });

    it('should include both matched and unmatched episodes', async () => {
      queryServiceEsClient.esql.query.mockResolvedValueOnce(
        getBulkGetAlertActionsESQLResponse([{ episode_id: 'episode-1', last_ack_action: 'ack' }])
      );

      const result = await client.bulkGet(['episode-1', 'episode-2']);

      expect(result).toEqual([
        {
          episode_id: 'episode-1',
          rule_id: 'test-rule-id',
          group_hash: 'test-group-hash',
          last_ack_action: 'ack',
          last_deactivate_action: null,
          last_snooze_action: null,
          tags: null,
        },
        {
          episode_id: 'episode-2',
          rule_id: null,
          group_hash: null,
          last_ack_action: null,
          last_deactivate_action: null,
          last_snooze_action: null,
          tags: null,
        },
      ]);
    });

    it('should return tags for episodes with tag actions', async () => {
      queryServiceEsClient.esql.query.mockResolvedValueOnce(
        getBulkGetAlertActionsESQLResponse([
          {
            episode_id: 'episode-1',
            rule_id: 'rule-1',
            group_hash: 'hash-1',
            last_ack_action: 'ack',
            tags: ['critical', 'network'],
          },
          {
            episode_id: 'episode-2',
            rule_id: 'rule-2',
            group_hash: 'hash-2',
            tags: ['security'],
          },
        ])
      );

      const result = await client.bulkGet(['episode-1', 'episode-2']);

      expect(result).toEqual([
        {
          episode_id: 'episode-1',
          rule_id: 'rule-1',
          group_hash: 'hash-1',
          last_ack_action: 'ack',
          last_deactivate_action: null,
          last_snooze_action: null,
          tags: ['critical', 'network'],
        },
        {
          episode_id: 'episode-2',
          rule_id: 'rule-2',
          group_hash: 'hash-2',
          last_ack_action: null,
          last_deactivate_action: null,
          last_snooze_action: null,
          tags: ['security'],
        },
      ]);
    });
  });
});
