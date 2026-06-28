/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import type { AlertAction } from '../../../resources/datastreams/alert_actions';
import {
  alertEpisodeStatus,
  alertEventStatus,
  alertEventType,
  type AlertEpisodeStatus,
} from '../../../resources/datastreams/alert_events';
import { ALERTING_V2_ERROR_CODES } from '../../errors/error_codes';
import { createQueryService } from '../../services/query_service/query_service.mock';
import {
  getLastEpisodeLifecycleActionsESQLResponse,
  getPreDeactivateAlertEventESQLResponse,
} from '../fixtures/query_responses';
import type { HandlerItem, HandlerPrepareContext, HandlerServices } from '../handler';
import type { AlertEventRecord } from '../types';
import { activateHandler } from './activate';

interface ActivateContextEntry {
  lastLifecycleActionType: string | null;
  preDeactivateEvent: AlertEventRecord | null;
}

const FIXED_NOW = '2026-06-28T19:00:00.000Z';

beforeAll(() => {
  jest.useFakeTimers().setSystemTime(new Date(FIXED_NOW));
});

afterAll(() => {
  jest.useRealTimers();
});

const buildAlertEvent = (overrides: Partial<AlertEventRecord> = {}): AlertEventRecord => ({
  '@timestamp': '2026-06-28T18:55:00.000Z',
  group_hash: 'group-1',
  episode_id: 'episode-1',
  rule_id: 'rule-1',
  rule_version: 2,
  space_id: 'default',
  data_json: { hostname: 'h1' },
  severity: 'medium',
  episode_status: alertEpisodeStatus.inactive,
  ...overrides,
});

const buildPreDeactivateEvent = (overrides: Partial<AlertEventRecord> = {}): AlertEventRecord => ({
  '@timestamp': '2026-06-28T18:50:00.000Z',
  group_hash: 'group-1',
  episode_id: 'episode-1',
  rule_id: 'rule-1',
  rule_version: 3,
  space_id: 'default',
  data_json: { hostname: 'h-pre' },
  severity: 'high',
  episode_status: alertEpisodeStatus.active,
  episode_status_count: 5,
  status: alertEventStatus.breached,
  ...overrides,
});

const buildItem = (
  alertEvent: AlertEventRecord = buildAlertEvent()
): HandlerItem<{
  action_type: typeof ALERT_EPISODE_ACTION_TYPE.ACTIVATE;
  reason: string;
}> => ({
  action: { action_type: ALERT_EPISODE_ACTION_TYPE.ACTIVATE, reason: 'reopen for follow-up' },
  alertEvent,
});

const buildCtx = (
  context: Map<string, ActivateContextEntry>,
  overrides: Partial<HandlerPrepareContext<Map<string, ActivateContextEntry>>> = {}
): HandlerPrepareContext<Map<string, ActivateContextEntry>> => ({
  alertActionDoc: { sentinel: 'audit-doc' } as unknown as AlertAction,
  userProfileUid: 'profile-1',
  context,
  ...overrides,
});

const buildContextEntry = (
  overrides: Partial<ActivateContextEntry> = {}
): ActivateContextEntry => ({
  lastLifecycleActionType: ALERT_EPISODE_ACTION_TYPE.DEACTIVATE,
  preDeactivateEvent: buildPreDeactivateEvent(),
  ...overrides,
});

const buildContextMap = (
  entries: Array<[string, ActivateContextEntry]>
): Map<string, ActivateContextEntry> => new Map(entries);

describe('activateHandler', () => {
  it('exposes a loadContext implementation — activate needs I/O preload', () => {
    expect(typeof activateHandler.loadContext).toBe('function');
  });

  describe('prepare (pure, context provided)', () => {
    it('forwards the precomputed audit doc unchanged on the happy path', () => {
      const context = buildContextMap([['episode-1', buildContextEntry()]]);
      const ctx = buildCtx(context);

      const prepared = activateHandler.prepare(buildItem(), ctx);

      expect(prepared.alertActionDoc).toBe(ctx.alertActionDoc);
    });

    it('rebuilds the synthetic rule event from the pre-deactivate event with @timestamp advanced to now', () => {
      const preDeactivateEvent = buildPreDeactivateEvent({
        rule_id: 'rule-pre',
        rule_version: 7,
        group_hash: 'group-pre',
        episode_id: 'episode-1',
        space_id: 'space-pre',
        data_json: { rebuilt: true },
        severity: 'critical',
        episode_status: alertEpisodeStatus.recovering,
        episode_status_count: 11,
        status: alertEventStatus.breached,
      });
      const context = buildContextMap([['episode-1', buildContextEntry({ preDeactivateEvent })]]);

      const prepared = activateHandler.prepare(buildItem(), buildCtx(context));

      expect(prepared.ruleEvent).toMatchObject({
        '@timestamp': FIXED_NOW,
        rule: { id: 'rule-pre', version: 7 },
        group_hash: 'group-pre',
        data: { rebuilt: true },
        status: alertEventStatus.breached,
        source: 'internal',
        type: alertEventType.alert,
        space_id: 'space-pre',
        episode: {
          id: 'episode-1',
          status: alertEpisodeStatus.recovering,
          status_count: 11,
        },
        severity: 'critical',
      });
    });

    it('defaults the pre-deactivate rule version to 1 when missing', () => {
      const preDeactivateEvent = buildPreDeactivateEvent({ rule_version: undefined });
      const context = buildContextMap([['episode-1', buildContextEntry({ preDeactivateEvent })]]);

      const prepared = activateHandler.prepare(buildItem(), buildCtx(context));

      expect(prepared.ruleEvent?.rule.version).toBe(1);
    });

    it("defaults rule event status to 'breached' when the pre-deactivate event omits status", () => {
      const preDeactivateEvent = buildPreDeactivateEvent({ status: undefined });
      const context = buildContextMap([['episode-1', buildContextEntry({ preDeactivateEvent })]]);

      const prepared = activateHandler.prepare(buildItem(), buildCtx(context));

      expect(prepared.ruleEvent?.status).toBe(alertEventStatus.breached);
    });

    it('omits severity / episode.status_count when the pre-deactivate event has none', () => {
      const preDeactivateEvent = buildPreDeactivateEvent({
        severity: null,
        episode_status_count: null,
      });
      const context = buildContextMap([['episode-1', buildContextEntry({ preDeactivateEvent })]]);

      const prepared = activateHandler.prepare(buildItem(), buildCtx(context));

      expect(prepared.ruleEvent?.severity).toBeUndefined();
      expect(prepared.ruleEvent?.episode?.status_count).toBeUndefined();
    });

    describe('precondition: episode must be inactive', () => {
      it.each<AlertEpisodeStatus | null | undefined>([
        alertEpisodeStatus.active,
        alertEpisodeStatus.recovering,
        alertEpisodeStatus.pending,
        null,
        undefined,
      ])(
        'rejects with INVALID_EPISODE_STATE_TRANSITION (400) when episode_status is %s',
        (status) => {
          const context = buildContextMap([['episode-1', buildContextEntry()]]);

          try {
            activateHandler.prepare(
              buildItem(buildAlertEvent({ episode_status: status })),
              buildCtx(context)
            );
            throw new Error('expected handler to throw');
          } catch (error) {
            expect(Boom.isBoom(error)).toBe(true);
            expect(error.output.statusCode).toBe(400);
            expect(error.data).toMatchObject({
              code: ALERTING_V2_ERROR_CODES.INVALID_EPISODE_STATE_TRANSITION,
              details: {
                group_hash: 'group-1',
                episode_id: 'episode-1',
                episode_status: status ?? null,
                action_type: ALERT_EPISODE_ACTION_TYPE.ACTIVATE,
              },
            });
          }
        }
      );
    });

    describe('precondition: most recent lifecycle action must be deactivate', () => {
      it.each<string | null>([null, ALERT_EPISODE_ACTION_TYPE.ACTIVATE])(
        'rejects with INVALID_EPISODE_STATE_TRANSITION (400) when last lifecycle action is %s',
        (lastLifecycleActionType) => {
          const context = buildContextMap([
            ['episode-1', buildContextEntry({ lastLifecycleActionType })],
          ]);

          try {
            activateHandler.prepare(buildItem(), buildCtx(context));
            throw new Error('expected handler to throw');
          } catch (error) {
            expect(Boom.isBoom(error)).toBe(true);
            expect(error.output.statusCode).toBe(400);
            expect(error.data).toMatchObject({
              code: ALERTING_V2_ERROR_CODES.INVALID_EPISODE_STATE_TRANSITION,
              details: {
                action_type: ALERT_EPISODE_ACTION_TYPE.ACTIVATE,
                last_lifecycle_action: lastLifecycleActionType,
              },
            });
            expect(error.message).toContain(`[${lastLifecycleActionType ?? 'none'}]`);
          }
        }
      );
    });

    describe('precondition: pre-deactivate event must exist', () => {
      it('rejects with ALERT_EVENT_NOT_FOUND (404) when the pre-deactivate event is missing', () => {
        const context = buildContextMap([
          ['episode-1', buildContextEntry({ preDeactivateEvent: null })],
        ]);

        try {
          activateHandler.prepare(buildItem(), buildCtx(context));
          throw new Error('expected handler to throw');
        } catch (error) {
          expect(Boom.isBoom(error)).toBe(true);
          expect(error.output.statusCode).toBe(404);
          expect(error.data).toMatchObject({
            code: ALERTING_V2_ERROR_CODES.ALERT_EVENT_NOT_FOUND,
            details: { group_hash: 'group-1', episode_id: 'episode-1' },
          });
        }
      });

      it('also rejects when the episode entry is entirely absent from the context map', () => {
        // Missing entry → handler falls back to the empty record and the
        // pre-deactivate precondition fires (404). The lifecycle and
        // status checks fire first; this test exercises status alone by
        // pointing at an inactive event with no map entry.
        const context = buildContextMap([]);

        expect(() => activateHandler.prepare(buildItem(), buildCtx(context))).toThrow();
      });
    });

    it("throws plainly when the pre-deactivate event's episode_status is neither active nor recovering (data corruption)", () => {
      const preDeactivateEvent = buildPreDeactivateEvent({
        episode_status: alertEpisodeStatus.inactive,
      });
      const context = buildContextMap([['episode-1', buildContextEntry({ preDeactivateEvent })]]);

      expect(() => activateHandler.prepare(buildItem(), buildCtx(context))).toThrow(
        /Pre-deactivate event has unexpected episode_status/
      );
    });
  });

  describe('loadContext (preload)', () => {
    const buildServices = () => {
      const { queryService, mockEsClient } = createQueryService();
      const services: HandlerServices = { queryService, spaceId: 'default' };
      return { services, mockEsClient };
    };

    it('returns an empty map when no items are supplied', async () => {
      const { services } = buildServices();
      const result = await activateHandler.loadContext!([], services);
      expect(result.size).toBe(0);
    });

    it('issues one lifecycle query + one pre-deactivate query against the space-scoped indices, in parallel', async () => {
      const { services, mockEsClient } = buildServices();

      mockEsClient.esql.query
        .mockResolvedValueOnce(
          getLastEpisodeLifecycleActionsESQLResponse([
            { episode_id: 'episode-1', last_action_type: ALERT_EPISODE_ACTION_TYPE.DEACTIVATE },
          ])
        )
        .mockResolvedValueOnce(
          getPreDeactivateAlertEventESQLResponse([
            { episode_id: 'episode-1', episode_status: 'active' },
          ])
        );

      const result = await activateHandler.loadContext!([buildItem()], services);

      expect(mockEsClient.esql.query).toHaveBeenCalledTimes(2);
      const issuedQueries = mockEsClient.esql.query.mock.calls.map(([req]) => req.query);
      expect(issuedQueries.some((q) => q.includes('FROM ".alert-actions"'))).toBe(true);
      expect(issuedQueries.some((q) => q.includes('FROM ".rule-events"'))).toBe(true);
      expect(issuedQueries.every((q) => q.includes('space_id == "default"'))).toBe(true);

      expect(result.get('episode-1')).toMatchObject({
        lastLifecycleActionType: ALERT_EPISODE_ACTION_TYPE.DEACTIVATE,
        preDeactivateEvent: expect.objectContaining({ episode_id: 'episode-1' }),
      });
    });

    it('produces a null entry for any episode the ES|QL response did not mention', async () => {
      const { services, mockEsClient } = buildServices();

      mockEsClient.esql.query
        .mockResolvedValueOnce(getLastEpisodeLifecycleActionsESQLResponse([]))
        .mockResolvedValueOnce(getPreDeactivateAlertEventESQLResponse([]));

      const result = await activateHandler.loadContext!([buildItem()], services);

      expect(result.get('episode-1')).toEqual({
        lastLifecycleActionType: null,
        preDeactivateEvent: null,
      });
    });

    it('deduplicates episode_ids across the input items', async () => {
      const { services, mockEsClient } = buildServices();

      mockEsClient.esql.query
        .mockResolvedValueOnce(getLastEpisodeLifecycleActionsESQLResponse([]))
        .mockResolvedValueOnce(getPreDeactivateAlertEventESQLResponse([]));

      const itemA = buildItem(buildAlertEvent({ episode_id: 'episode-1' }));
      const itemB = buildItem(buildAlertEvent({ episode_id: 'episode-1' }));
      const itemC = buildItem(buildAlertEvent({ episode_id: 'episode-2' }));

      await activateHandler.loadContext!([itemA, itemB, itemC], services);

      const issuedQueries = mockEsClient.esql.query.mock.calls.map(([req]) => req.query);
      for (const query of issuedQueries) {
        expect(query.match(/"episode-1"/g)?.length).toBe(1);
        expect(query.match(/"episode-2"/g)?.length).toBe(1);
      }
    });
  });
});
