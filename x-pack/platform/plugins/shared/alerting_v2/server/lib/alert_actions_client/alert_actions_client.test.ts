/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { UserProfileServiceStart } from '@kbn/core-user-profile-server';
import type { DeeplyMockedApi } from '@kbn/core-elasticsearch-client-server-mocks';
import type { BulkCreateAlertActionItemBody } from '@kbn/alerting-v2-schemas';
import { ALERT_EPISODE_ACTION_TYPE, type CreateAlertActionBody } from '@kbn/alerting-v2-schemas';
import type { AlertActionEventPublisher } from '../events/alert_action_event_publisher/alert_action_event_publisher';
import type { AlertActionsClient } from './alert_actions_client';
import { createAlertActionsClient } from './alert_actions_client.mock';
import {
  getBulkAlertEventsESQLResponse,
  getAlertEventESQLResponse,
  getEmptyESQLResponse,
  getLastEpisodeActionESQLResponse,
  getPreDeactivateAlertEventESQLResponse,
} from './fixtures/query_responses';

describe('AlertActionsClient', () => {
  jest.useFakeTimers().setSystemTime(new Date('2025-01-01T11:12:13.000Z'));
  let client: AlertActionsClient;
  let queryServiceEsClient: DeeplyMockedApi<ElasticsearchClient>;
  let storageServiceEsClient: jest.Mocked<ElasticsearchClient>;
  let userProfileService: jest.Mocked<UserProfileServiceStart>;
  let alertActionEventPublisher: AlertActionEventPublisher;
  let emitEpisodeActionsSpy: jest.SpyInstance;

  beforeEach(() => {
    ({
      alertActionsClient: client,
      queryServiceEsClient,
      storageServiceEsClient,
      userProfileService,
      alertActionEventPublisher,
    } = createAlertActionsClient());
    emitEpisodeActionsSpy = jest.spyOn(alertActionEventPublisher, 'emitEpisodeActions');
    storageServiceEsClient.bulk.mockResolvedValueOnce({ items: [], errors: false, took: 1 });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAction', () => {
    const actionData: CreateAlertActionBody = {
      action_type: ALERT_EPISODE_ACTION_TYPE.ACK,
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
        action_type: ALERT_EPISODE_ACTION_TYPE.ACK,
        episode_id: 'episode-1',
        rule_id: 'test-rule-id',
        last_series_event_timestamp: '2025-01-01T00:00:00.000Z',
        actor: 'test-uid',
        space_id: 'default',
      });
      expect(docs[0]).toHaveProperty('@timestamp');
    });

    it('should handle action with episode_id', async () => {
      const actionWithEpisode: CreateAlertActionBody = {
        action_type: ALERT_EPISODE_ACTION_TYPE.ACK,
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
        action_type: ALERT_EPISODE_ACTION_TYPE.TAG,
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
        action_type: ALERT_EPISODE_ACTION_TYPE.TAG,
        tags: ['critical', 'network'],
        rule_id: 'test-rule-id',
        actor: 'test-uid',
      });
    });

    it('should handle null profile uid when security is not available', async () => {
      queryServiceEsClient.esql.query.mockResolvedValueOnce(getAlertEventESQLResponse());
      userProfileService.getCurrent.mockResolvedValueOnce(null);

      await client.createAction({
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

  describe('createAction deactivate', () => {
    const deactivateAction: CreateAlertActionBody = {
      action_type: ALERT_EPISODE_ACTION_TYPE.DEACTIVATE,
      reason: 'no longer relevant',
    };

    /** Pulls the [create-meta, doc, create-meta, doc, ...] tuples from the single bulk call. */
    const getBulkPairs = () => {
      const callArgs = storageServiceEsClient.bulk.mock.calls[0][0];
      const operations = callArgs.operations ?? [];
      const pairs: Array<{ create: unknown; doc: unknown }> = [];
      for (let i = 0; i < operations.length; i += 2) {
        pairs.push({ create: operations[i], doc: operations[i + 1] });
      }
      return pairs;
    };

    beforeEach(() => {
      storageServiceEsClient.bulk.mockReset();
      storageServiceEsClient.bulk.mockResolvedValue({ items: [], errors: false, took: 1 });
    });

    it('submits both the synthetic .rule-events doc and the .alert-actions audit doc in a single bulk call', async () => {
      queryServiceEsClient.esql.query.mockResolvedValueOnce(getAlertEventESQLResponse());

      await client.createAction({ groupHash: 'test-group-hash', action: deactivateAction });

      expect(storageServiceEsClient.bulk).toHaveBeenCalledTimes(1);
      const pairs = getBulkPairs();
      expect(pairs).toHaveLength(2);
      expect(pairs[0].create).toEqual({ create: { _index: '.rule-events' } });
      expect(pairs[1].create).toEqual({ create: { _index: '.alert-actions' } });
    });

    it('builds the synthetic .rule-events doc from the latest event (rule, data, episode, severity)', async () => {
      queryServiceEsClient.esql.query.mockResolvedValueOnce(
        getAlertEventESQLResponse({
          rule_version: 3,
          data_json: JSON.stringify({ 'host.name': 'host-a' }),
          severity: 'high',
        })
      );

      await client.createAction({ groupHash: 'test-group-hash', action: deactivateAction });

      expect(getBulkPairs()[0].doc).toEqual({
        '@timestamp': expect.any(String),
        rule: { id: 'test-rule-id', version: 3 },
        group_hash: 'test-group-hash',
        data: { 'host.name': 'host-a' },
        status: 'recovered',
        source: 'internal',
        type: 'alert',
        episode: { id: 'episode-1', status: 'inactive' },
        space_id: 'default',
        severity: 'high',
      });
    });

    it('builds the .alert-actions audit doc with fields drawn from the latest event', async () => {
      queryServiceEsClient.esql.query.mockResolvedValueOnce(getAlertEventESQLResponse());

      await client.createAction({ groupHash: 'test-group-hash', action: deactivateAction });

      expect(getBulkPairs()[1].doc).toMatchObject({
        action_type: 'deactivate',
        group_hash: 'test-group-hash',
        episode_id: 'episode-1',
        rule_id: 'test-rule-id',
        last_series_event_timestamp: '2025-01-01T00:00:00.000Z',
        reason: 'no longer relevant',
        space_id: 'default',
        actor: 'test-uid',
      });
    });

    it('uses wait_for refresh so the deactivation is immediately visible', async () => {
      queryServiceEsClient.esql.query.mockResolvedValueOnce(getAlertEventESQLResponse());

      await client.createAction({ groupHash: 'test-group-hash', action: deactivateAction });

      expect(storageServiceEsClient.bulk.mock.calls[0][0].refresh).toBe('wait_for');
    });

    it('omits severity from the synthetic event when the latest event has none', async () => {
      queryServiceEsClient.esql.query.mockResolvedValueOnce(getAlertEventESQLResponse());

      await client.createAction({ groupHash: 'test-group-hash', action: deactivateAction });

      expect(getBulkPairs()[0].doc).not.toHaveProperty('severity');
    });

    it('writes empty data when the latest event has no data_json or it is malformed', async () => {
      queryServiceEsClient.esql.query.mockResolvedValueOnce(
        getAlertEventESQLResponse({ data_json: 'not-json' })
      );

      await client.createAction({ groupHash: 'test-group-hash', action: deactivateAction });

      expect(getBulkPairs()[0].doc).toMatchObject({ data: {} });
    });

    it('emits the persisted deactivate action document', async () => {
      queryServiceEsClient.esql.query.mockResolvedValueOnce(getAlertEventESQLResponse());

      await client.createAction({ groupHash: 'test-group-hash', action: deactivateAction });

      expect(emitEpisodeActionsSpy).toHaveBeenCalledTimes(1);
      expect(emitEpisodeActionsSpy).toHaveBeenCalledWith(expect.anything(), [
        expect.objectContaining({ action_type: 'deactivate', group_hash: 'test-group-hash' }),
      ]);
    });

    it('does not emit the action event when the bulk write rejects', async () => {
      queryServiceEsClient.esql.query.mockResolvedValueOnce(getAlertEventESQLResponse());
      storageServiceEsClient.bulk.mockReset();
      storageServiceEsClient.bulk.mockRejectedValueOnce(new Error('bulk write failed'));

      await expect(
        client.createAction({ groupHash: 'test-group-hash', action: deactivateAction })
      ).rejects.toThrow('bulk write failed');

      expect(emitEpisodeActionsSpy).not.toHaveBeenCalled();
    });

    it('throws ALERT_EVENT_NOT_FOUND and writes nothing when there is no prior rule event', async () => {
      queryServiceEsClient.esql.query.mockResolvedValueOnce(getEmptyESQLResponse());

      await expect(
        client.createAction({ groupHash: 'unknown-group-hash', action: deactivateAction })
      ).rejects.toMatchObject({
        output: { statusCode: 404 },
        data: { code: 'ALERT_EVENT_NOT_FOUND', details: { group_hash: 'unknown-group-hash' } },
      });

      expect(storageServiceEsClient.bulk).not.toHaveBeenCalled();
      expect(emitEpisodeActionsSpy).not.toHaveBeenCalled();
    });

    describe('precondition: episode must be active or recovering', () => {
      it.each(['active', 'recovering'] as const)(
        'allows deactivate when episode_status is %s',
        async (episodeStatus) => {
          queryServiceEsClient.esql.query.mockResolvedValueOnce(
            getAlertEventESQLResponse({ episode_status: episodeStatus })
          );

          await client.createAction({ groupHash: 'test-group-hash', action: deactivateAction });

          expect(storageServiceEsClient.bulk).toHaveBeenCalledTimes(1);
          expect(emitEpisodeActionsSpy).toHaveBeenCalledTimes(1);
        }
      );

      it.each(['inactive', 'pending'] as const)(
        'rejects deactivate with INVALID_EPISODE_STATE_TRANSITION (400) when episode_status is %s',
        async (episodeStatus) => {
          queryServiceEsClient.esql.query.mockResolvedValueOnce(
            getAlertEventESQLResponse({
              episode_id: 'episode-1',
              episode_status: episodeStatus,
            })
          );

          await expect(
            client.createAction({ groupHash: 'test-group-hash', action: deactivateAction })
          ).rejects.toMatchObject({
            output: { statusCode: 400 },
            data: {
              code: 'INVALID_EPISODE_STATE_TRANSITION',
              details: {
                group_hash: 'test-group-hash',
                episode_id: 'episode-1',
                episode_status: episodeStatus,
                action_type: 'deactivate',
              },
            },
          });

          expect(storageServiceEsClient.bulk).not.toHaveBeenCalled();
          expect(emitEpisodeActionsSpy).not.toHaveBeenCalled();
        }
      );
    });
  });

  describe('createAction activate', () => {
    const activateAction: CreateAlertActionBody = {
      action_type: ALERT_EPISODE_ACTION_TYPE.ACTIVATE,
      reason: 'reopen this episode',
    };

    /** Pulls the [create-meta, doc, create-meta, doc, ...] tuples from the single bulk call. */
    const getBulkPairs = () => {
      const callArgs = storageServiceEsClient.bulk.mock.calls[0][0];
      const operations = callArgs.operations ?? [];
      const pairs: Array<{ create: unknown; doc: unknown }> = [];
      for (let i = 0; i < operations.length; i += 2) {
        pairs.push({ create: operations[i], doc: operations[i + 1] });
      }
      return pairs;
    };

    /**
     * Sets up the three sequential ESQL reads the activate flow performs:
     *
     *   1. latest `.rule-events` doc for `group_hash` (must be the deactivate-synthetic).
     *   2. latest `.alert-actions` doc for the episode (must be `deactivate`).
     *   3. pre-deactivate `.rule-events` doc for the episode (the lifecycle state to restore).
     *
     * Each test overrides the bits relevant to the case under test and lets defaults cover
     * the rest. Tests that exercise an early-rejection path skip later reads.
     */
    const mockHappyPathReads = (overrides?: {
      latestEvent?: Parameters<typeof getAlertEventESQLResponse>[0];
      lastAction?: Parameters<typeof getLastEpisodeActionESQLResponse>[0];
      preDeactivate?: Parameters<typeof getPreDeactivateAlertEventESQLResponse>[0];
    }) => {
      queryServiceEsClient.esql.query
        .mockResolvedValueOnce(
          getAlertEventESQLResponse({ episode_status: 'inactive', ...overrides?.latestEvent })
        )
        .mockResolvedValueOnce(
          getLastEpisodeActionESQLResponse({ action_type: 'deactivate', ...overrides?.lastAction })
        )
        .mockResolvedValueOnce(getPreDeactivateAlertEventESQLResponse(overrides?.preDeactivate));
    };

    beforeEach(() => {
      storageServiceEsClient.bulk.mockReset();
      storageServiceEsClient.bulk.mockResolvedValue({ items: [], errors: false, took: 1 });
    });

    it('submits both the synthetic .rule-events doc and the .alert-actions audit doc in a single bulk call', async () => {
      mockHappyPathReads();

      await client.createAction({ groupHash: 'test-group-hash', action: activateAction });

      expect(storageServiceEsClient.bulk).toHaveBeenCalledTimes(1);
      const pairs = getBulkPairs();
      expect(pairs).toHaveLength(2);
      expect(pairs[0].create).toEqual({ create: { _index: '.rule-events' } });
      expect(pairs[1].create).toEqual({ create: { _index: '.alert-actions' } });
    });

    it('restores the synthetic .rule-events doc from the pre-deactivate active event', async () => {
      mockHappyPathReads({
        preDeactivate: {
          rule_version: 7,
          status: 'breached',
          episode_status: 'active',
          data_json: JSON.stringify({ 'host.name': 'host-a' }),
          severity: 'high',
        },
      });

      await client.createAction({ groupHash: 'test-group-hash', action: activateAction });

      expect(getBulkPairs()[0].doc).toEqual({
        '@timestamp': expect.any(String),
        rule: { id: 'test-rule-id', version: 7 },
        group_hash: 'test-group-hash',
        data: { 'host.name': 'host-a' },
        status: 'breached',
        source: 'internal',
        type: 'alert',
        episode: { id: 'episode-1', status: 'active' },
        space_id: 'default',
        severity: 'high',
      });
    });

    it('restores recovering episodes preserving episode.status_count', async () => {
      mockHappyPathReads({
        preDeactivate: {
          status: 'recovered',
          episode_status: 'recovering',
          episode_status_count: 2,
        },
      });

      await client.createAction({ groupHash: 'test-group-hash', action: activateAction });

      expect(getBulkPairs()[0].doc).toMatchObject({
        status: 'recovered',
        episode: { id: 'episode-1', status: 'recovering', status_count: 2 },
      });
    });

    it('omits severity from the synthetic event when the pre-deactivate event has none', async () => {
      mockHappyPathReads();

      await client.createAction({ groupHash: 'test-group-hash', action: activateAction });

      expect(getBulkPairs()[0].doc).not.toHaveProperty('severity');
    });

    it('writes empty data when the pre-deactivate event has no data_json or it is malformed', async () => {
      mockHappyPathReads({ preDeactivate: { data_json: 'not-json' } });

      await client.createAction({ groupHash: 'test-group-hash', action: activateAction });

      expect(getBulkPairs()[0].doc).toMatchObject({ data: {} });
    });

    it('builds the .alert-actions audit doc from the latest event and the activate body', async () => {
      mockHappyPathReads();

      await client.createAction({ groupHash: 'test-group-hash', action: activateAction });

      expect(getBulkPairs()[1].doc).toMatchObject({
        action_type: 'activate',
        group_hash: 'test-group-hash',
        episode_id: 'episode-1',
        rule_id: 'test-rule-id',
        last_series_event_timestamp: '2025-01-01T00:00:00.000Z',
        reason: 'reopen this episode',
        space_id: 'default',
        actor: 'test-uid',
      });
    });

    it('uses wait_for refresh so the activation is immediately visible', async () => {
      mockHappyPathReads();

      await client.createAction({ groupHash: 'test-group-hash', action: activateAction });

      expect(storageServiceEsClient.bulk.mock.calls[0][0].refresh).toBe('wait_for');
    });

    it('emits the persisted activate action document', async () => {
      mockHappyPathReads();

      await client.createAction({ groupHash: 'test-group-hash', action: activateAction });

      expect(emitEpisodeActionsSpy).toHaveBeenCalledTimes(1);
      expect(emitEpisodeActionsSpy).toHaveBeenCalledWith(expect.anything(), [
        expect.objectContaining({ action_type: 'activate', group_hash: 'test-group-hash' }),
      ]);
    });

    it('does not emit the action event when the bulk write rejects', async () => {
      mockHappyPathReads();
      storageServiceEsClient.bulk.mockReset();
      storageServiceEsClient.bulk.mockRejectedValueOnce(new Error('bulk write failed'));

      await expect(
        client.createAction({ groupHash: 'test-group-hash', action: activateAction })
      ).rejects.toThrow('bulk write failed');

      expect(emitEpisodeActionsSpy).not.toHaveBeenCalled();
    });

    it('throws ALERT_EVENT_NOT_FOUND when there is no prior rule event for the group_hash', async () => {
      queryServiceEsClient.esql.query.mockResolvedValueOnce(getEmptyESQLResponse());

      await expect(
        client.createAction({ groupHash: 'unknown-group-hash', action: activateAction })
      ).rejects.toMatchObject({
        output: { statusCode: 404 },
        data: { code: 'ALERT_EVENT_NOT_FOUND', details: { group_hash: 'unknown-group-hash' } },
      });

      expect(storageServiceEsClient.bulk).not.toHaveBeenCalled();
      expect(emitEpisodeActionsSpy).not.toHaveBeenCalled();
    });

    it('throws ALERT_EVENT_NOT_FOUND when no pre-deactivate event exists for the episode', async () => {
      queryServiceEsClient.esql.query
        .mockResolvedValueOnce(
          getAlertEventESQLResponse({ episode_id: 'episode-1', episode_status: 'inactive' })
        )
        .mockResolvedValueOnce(getLastEpisodeActionESQLResponse({ action_type: 'deactivate' }))
        .mockResolvedValueOnce(getEmptyESQLResponse());

      await expect(
        client.createAction({ groupHash: 'test-group-hash', action: activateAction })
      ).rejects.toMatchObject({
        output: { statusCode: 404 },
        data: {
          code: 'ALERT_EVENT_NOT_FOUND',
          details: { group_hash: 'test-group-hash', episode_id: 'episode-1' },
        },
      });

      expect(storageServiceEsClient.bulk).not.toHaveBeenCalled();
    });

    describe('precondition: latest episode for the group must be inactive', () => {
      it.each(['active', 'recovering', 'pending'] as const)(
        'rejects activate with INVALID_EPISODE_STATE_TRANSITION (400) when latest episode_status is %s',
        async (episodeStatus) => {
          queryServiceEsClient.esql.query.mockResolvedValueOnce(
            getAlertEventESQLResponse({
              episode_id: 'episode-1',
              episode_status: episodeStatus,
            })
          );

          await expect(
            client.createAction({ groupHash: 'test-group-hash', action: activateAction })
          ).rejects.toMatchObject({
            output: { statusCode: 400 },
            data: {
              code: 'INVALID_EPISODE_STATE_TRANSITION',
              details: {
                group_hash: 'test-group-hash',
                episode_id: 'episode-1',
                episode_status: episodeStatus,
                action_type: 'activate',
              },
            },
          });

          expect(storageServiceEsClient.bulk).not.toHaveBeenCalled();
          expect(emitEpisodeActionsSpy).not.toHaveBeenCalled();
        }
      );
    });

    describe('precondition: most recent lifecycle action for the episode must be deactivate', () => {
      it('rejects activate with INVALID_EPISODE_STATE_TRANSITION (400) when the most recent lifecycle action is activate (double-activate)', async () => {
        queryServiceEsClient.esql.query
          .mockResolvedValueOnce(
            getAlertEventESQLResponse({ episode_id: 'episode-1', episode_status: 'inactive' })
          )
          .mockResolvedValueOnce(getLastEpisodeActionESQLResponse({ action_type: 'activate' }));

        await expect(
          client.createAction({ groupHash: 'test-group-hash', action: activateAction })
        ).rejects.toMatchObject({
          output: { statusCode: 400 },
          data: {
            code: 'INVALID_EPISODE_STATE_TRANSITION',
            details: {
              group_hash: 'test-group-hash',
              episode_id: 'episode-1',
              episode_status: 'inactive',
              action_type: 'activate',
              last_lifecycle_action: 'activate',
            },
          },
        });

        expect(storageServiceEsClient.bulk).not.toHaveBeenCalled();
        expect(emitEpisodeActionsSpy).not.toHaveBeenCalled();
      });

      it('rejects activate when the episode has no prior lifecycle actions (natural recovery)', async () => {
        queryServiceEsClient.esql.query
          .mockResolvedValueOnce(
            getAlertEventESQLResponse({ episode_id: 'episode-1', episode_status: 'inactive' })
          )
          .mockResolvedValueOnce(getEmptyESQLResponse());

        await expect(
          client.createAction({ groupHash: 'test-group-hash', action: activateAction })
        ).rejects.toMatchObject({
          output: { statusCode: 400 },
          data: {
            code: 'INVALID_EPISODE_STATE_TRANSITION',
            details: {
              group_hash: 'test-group-hash',
              episode_id: 'episode-1',
              episode_status: 'inactive',
              action_type: 'activate',
              last_lifecycle_action: null,
            },
          },
        });

        expect(storageServiceEsClient.bulk).not.toHaveBeenCalled();
      });

      it('allows activate when non-lifecycle actions (tag/ack/snooze) were applied after the deactivate', async () => {
        // The lifecycle-only ESQL filter (`action_type IN ('deactivate', 'activate')`)
        // hides intervening tag/ack/snooze/assign rows, so the latest lifecycle
        // action is still `deactivate` and activate proceeds to the bulk write.
        mockHappyPathReads();

        await client.createAction({ groupHash: 'test-group-hash', action: activateAction });

        expect(storageServiceEsClient.bulk).toHaveBeenCalledTimes(1);
        expect(emitEpisodeActionsSpy).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('createBulkActions', () => {
    it('should process all actions successfully', async () => {
      const actions: BulkCreateAlertActionItemBody[] = [
        {
          group_hash: 'group-hash-1',
          action_type: ALERT_EPISODE_ACTION_TYPE.ACK,
          episode_id: 'episode-1',
        },
        { group_hash: 'group-hash-2', action_type: ALERT_EPISODE_ACTION_TYPE.SNOOZE },
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
      const actions: BulkCreateAlertActionItemBody[] = [
        {
          group_hash: 'group-hash-1',
          action_type: ALERT_EPISODE_ACTION_TYPE.ACK,
          episode_id: 'episode-1',
        },
        {
          group_hash: 'unknown-group-hash',
          action_type: ALERT_EPISODE_ACTION_TYPE.ACK,
          episode_id: 'episode-1',
        },
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
      const actions: BulkCreateAlertActionItemBody[] = [
        {
          group_hash: 'unknown-1',
          action_type: ALERT_EPISODE_ACTION_TYPE.ACK,
          episode_id: 'episode-1',
        },
        {
          group_hash: 'unknown-2',
          action_type: ALERT_EPISODE_ACTION_TYPE.SNOOZE,
        },
      ];

      queryServiceEsClient.esql.query.mockResolvedValueOnce(getBulkAlertEventsESQLResponse([]));

      const result = await client.createBulkActions(actions);

      expect(result).toEqual({ processed: 0, total: 2 });
      expect(storageServiceEsClient.bulk).not.toHaveBeenCalled();
    });
  });

  describe('episode action domain events', () => {
    it('calls emitEpisodeActions with the persisted assign action document', async () => {
      queryServiceEsClient.esql.query.mockResolvedValueOnce(getAlertEventESQLResponse());

      await client.createAction({
        groupHash: 'test-group-hash',
        action: {
          action_type: ALERT_EPISODE_ACTION_TYPE.ASSIGN,
          episode_id: 'episode-1',
          assignee_uid: 'assignee-uid-1',
        },
      });

      expect(emitEpisodeActionsSpy).toHaveBeenCalledTimes(1);
      expect(emitEpisodeActionsSpy).toHaveBeenCalledWith(expect.anything(), [
        expect.objectContaining({
          action_type: ALERT_EPISODE_ACTION_TYPE.ASSIGN,
          assignee_uid: 'assignee-uid-1',
          episode_id: 'episode-1',
          group_hash: 'test-group-hash',
          actor: 'test-uid',
        }),
      ]);
    });

    it('does not call emitEpisodeActions when persistence fails', async () => {
      queryServiceEsClient.esql.query.mockResolvedValueOnce(getEmptyESQLResponse());

      await expect(
        client.createAction({
          groupHash: 'unknown-group-hash',
          action: {
            action_type: ALERT_EPISODE_ACTION_TYPE.ASSIGN,
            episode_id: 'episode-1',
            assignee_uid: 'assignee-uid-1',
          },
        })
      ).rejects.toThrow();

      expect(emitEpisodeActionsSpy).not.toHaveBeenCalled();
    });

    it('calls emitEpisodeActions for bulk assign actions only among persisted docs', async () => {
      const actions: BulkCreateAlertActionItemBody[] = [
        {
          group_hash: 'group-hash-1',
          action_type: ALERT_EPISODE_ACTION_TYPE.ASSIGN,
          episode_id: 'episode-1',
          assignee_uid: 'assignee-uid-1',
        },
        {
          group_hash: 'group-hash-2',
          action_type: ALERT_EPISODE_ACTION_TYPE.ACK,
          episode_id: 'episode-2',
        },
      ];

      queryServiceEsClient.esql.query.mockResolvedValueOnce(
        getBulkAlertEventsESQLResponse([
          { group_hash: 'group-hash-1', episode_id: 'episode-1' },
          { group_hash: 'group-hash-2', episode_id: 'episode-2' },
        ])
      );

      await client.createBulkActions(actions);

      expect(emitEpisodeActionsSpy).toHaveBeenCalledTimes(1);
      expect(emitEpisodeActionsSpy.mock.calls[0][1]).toHaveLength(2);
      expect(emitEpisodeActionsSpy.mock.calls[0][1][0]).toMatchObject({
        action_type: ALERT_EPISODE_ACTION_TYPE.ASSIGN,
      });
      expect(emitEpisodeActionsSpy.mock.calls[0][1][1]).toMatchObject({
        action_type: ALERT_EPISODE_ACTION_TYPE.ACK,
      });
    });
  });

  describe('error codes and details', () => {
    it('attaches ALERT_EVENT_NOT_FOUND code with group_hash and episode_id details on createAction', async () => {
      queryServiceEsClient.esql.query.mockResolvedValueOnce(getEmptyESQLResponse());

      await expect(
        client.createAction({
          groupHash: 'unknown-group-hash',
          action: {
            action_type: ALERT_EPISODE_ACTION_TYPE.ACK,
            episode_id: 'episode-1',
          },
        })
      ).rejects.toMatchObject({
        output: { statusCode: 404 },
        data: {
          code: 'ALERT_EVENT_NOT_FOUND',
          details: {
            group_hash: 'unknown-group-hash',
            episode_id: 'episode-1',
          },
        },
      });

      expect(storageServiceEsClient.bulk).not.toHaveBeenCalled();
    });
  });
});
