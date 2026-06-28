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
import type { HandlerPrepareContext } from '../handler';
import type { AlertEventRecord } from '../types';
import { deactivateHandler } from './deactivate';

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
  severity: 'high',
  episode_status: alertEpisodeStatus.active,
  status: alertEventStatus.breached,
  ...overrides,
});

const buildCtx = (
  overrides: Partial<HandlerPrepareContext<unknown>> = {}
): HandlerPrepareContext<unknown> => ({
  alertActionDoc: { sentinel: 'audit-doc' } as unknown as AlertAction,
  userProfileUid: 'profile-1',
  context: undefined,
  ...overrides,
});

const buildItem = (alertEvent: AlertEventRecord) => ({
  action: {
    action_type: ALERT_EPISODE_ACTION_TYPE.DEACTIVATE,
    reason: 'manual deactivate',
  } as const,
  alertEvent,
});

describe('deactivateHandler', () => {
  it('does not preload context — every input is already on the alertEvent', () => {
    expect(deactivateHandler.loadContext).toBeUndefined();
  });

  describe('happy path', () => {
    it.each<AlertEpisodeStatus>([alertEpisodeStatus.active, alertEpisodeStatus.recovering])(
      'allows deactivate when episode_status is %s',
      (status) => {
        const ctx = buildCtx();
        expect(() =>
          deactivateHandler.prepare(buildItem(buildAlertEvent({ episode_status: status })), ctx)
        ).not.toThrow();
      }
    );

    it('forwards the precomputed audit doc unchanged', () => {
      const ctx = buildCtx();
      const prepared = deactivateHandler.prepare(buildItem(buildAlertEvent()), ctx);
      expect(prepared.alertActionDoc).toBe(ctx.alertActionDoc);
    });

    it('builds a synthetic .rule-events doc that marks the episode inactive and recovered', () => {
      const alertEvent = buildAlertEvent();
      const prepared = deactivateHandler.prepare(buildItem(alertEvent), buildCtx());

      expect(prepared.ruleEvent).toMatchObject({
        '@timestamp': FIXED_NOW,
        rule: { id: alertEvent.rule_id, version: alertEvent.rule_version },
        group_hash: alertEvent.group_hash,
        data: alertEvent.data_json,
        status: alertEventStatus.recovered,
        source: 'internal',
        type: alertEventType.alert,
        space_id: alertEvent.space_id,
        episode: { id: alertEvent.episode_id, status: alertEpisodeStatus.inactive },
        severity: alertEvent.severity,
      });
    });

    it('defaults rule version to 1 when the alert event omits it', () => {
      const prepared = deactivateHandler.prepare(
        buildItem(buildAlertEvent({ rule_version: undefined })),
        buildCtx()
      );

      expect(prepared.ruleEvent?.rule.version).toBe(1);
    });

    it('omits severity on the synthetic event when the alert event has none', () => {
      const prepared = deactivateHandler.prepare(
        buildItem(buildAlertEvent({ severity: null })),
        buildCtx()
      );

      expect(prepared.ruleEvent?.severity).toBeUndefined();
    });
  });

  describe('precondition: episode must be active or recovering', () => {
    it.each<AlertEpisodeStatus | null | undefined>([
      alertEpisodeStatus.pending,
      alertEpisodeStatus.inactive,
      null,
      undefined,
    ])(
      'rejects deactivate with INVALID_EPISODE_STATE_TRANSITION (400) when episode_status is %s',
      (status) => {
        try {
          deactivateHandler.prepare(
            buildItem(buildAlertEvent({ episode_status: status })),
            buildCtx()
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
              action_type: ALERT_EPISODE_ACTION_TYPE.DEACTIVATE,
            },
          });
        }
      }
    );

    it('renders the rejection message with the actual status value when present', () => {
      try {
        deactivateHandler.prepare(
          buildItem(buildAlertEvent({ episode_status: alertEpisodeStatus.inactive })),
          buildCtx()
        );
        throw new Error('expected handler to throw');
      } catch (error) {
        expect(error.message).toContain(`[${alertEpisodeStatus.inactive}]`);
        expect(error.message).toContain(
          "only 'active' or 'recovering' episodes can be deactivated"
        );
      }
    });

    it("renders 'unknown' when the alert event has no episode status", () => {
      try {
        deactivateHandler.prepare(
          buildItem(buildAlertEvent({ episode_status: undefined })),
          buildCtx()
        );
        throw new Error('expected handler to throw');
      } catch (error) {
        expect(error.message).toContain('[unknown]');
      }
    });
  });
});
