/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { bulkUpdateAlertWorkflowStatus } from '@kbn/response-ops-alerts-apis/apis/bulk_update_alert_workflow_status';
import { bulkUpdateAlertTags } from '@kbn/response-ops-alerts-apis/apis/bulk_update_alert_tags';
import { bulkUntrackAlerts } from '@kbn/response-ops-alerts-apis/apis/bulk_untrack_alerts';
import { bulkMuteAlerts } from '@kbn/response-ops-alerts-apis/apis/bulk_mute_alerts';
import { bulkUnmuteAlerts } from '@kbn/response-ops-alerts-apis/apis/bulk_unmute_alerts';
import { snoozeAlertInstance } from '@kbn/response-ops-alerts-apis/apis/snooze_alert_instance';
import { unsnoozeAlertInstance } from '@kbn/response-ops-alerts-apis/apis/unsnooze_alert_instance';
import { ALERT_EPISODE_ACTION_TYPE, ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type { AlertEpisode } from '../queries/episodes_query';
import type { ClassicAlertActionContext } from './utils/map_alert';
import { classicActionExtensions } from './action_extensions';

jest.mock('@kbn/response-ops-alerts-apis/apis/bulk_update_alert_workflow_status');
jest.mock('@kbn/response-ops-alerts-apis/apis/bulk_update_alert_tags');
jest.mock('@kbn/response-ops-alerts-apis/apis/bulk_untrack_alerts');
jest.mock('@kbn/response-ops-alerts-apis/apis/bulk_mute_alerts');
jest.mock('@kbn/response-ops-alerts-apis/apis/bulk_unmute_alerts');
jest.mock('@kbn/response-ops-alerts-apis/apis/snooze_alert_instance');
jest.mock('@kbn/response-ops-alerts-apis/apis/unsnooze_alert_instance');

const mockedBulkUpdate = bulkUpdateAlertWorkflowStatus as jest.MockedFunction<
  typeof bulkUpdateAlertWorkflowStatus
>;
const mockedBulkUpdateTags = bulkUpdateAlertTags as jest.MockedFunction<typeof bulkUpdateAlertTags>;
const mockedBulkUntrack = bulkUntrackAlerts as jest.MockedFunction<typeof bulkUntrackAlerts>;
const mockedBulkMute = bulkMuteAlerts as jest.MockedFunction<typeof bulkMuteAlerts>;
const mockedBulkUnmute = bulkUnmuteAlerts as jest.MockedFunction<typeof bulkUnmuteAlerts>;
const mockedSnooze = snoozeAlertInstance as jest.MockedFunction<typeof snoozeAlertInstance>;
const mockedUnsnooze = unsnoozeAlertInstance as jest.MockedFunction<typeof unsnoozeAlertInstance>;

const makeClassicEpisode = (
  id: string,
  workflowStatus: string,
  overrides: Partial<AlertEpisode> & {
    index?: string;
    instanceId?: string;
    ruleId?: string;
    workflowTags?: string[];
  } = {}
): AlertEpisode => {
  const {
    index = '.alerts-test',
    instanceId = 'inst-1',
    ruleId = 'r1',
    workflowTags = [],
    ...episodeOverrides
  } = overrides;
  return {
    '@timestamp': '2026-04-23T00:00:00Z',
    'episode.id': id,
    'episode.status': 'active',
    'rule.id': ruleId,
    group_hash: id,
    first_timestamp: '2026-04-23T00:00:00Z',
    last_timestamp: '2026-04-23T00:00:00Z',
    duration: 0,
    source_id: 'classic-alerts',
    source_action_context: {
      index,
      alertUuid: id,
      instanceId,
      ruleId,
      ruleCategory: 'Test',
      workflowStatus,
      workflowTags,
    } as ClassicAlertActionContext,
    ...episodeOverrides,
  } as AlertEpisode;
};

const getExtension = (actionId: string) =>
  classicActionExtensions.find((ext) => ext.actionId === actionId)!;

const ackExtension = getExtension('ALERTING_V2_ACK_EPISODE');
const unackExtension = getExtension('ALERTING_V2_UNACK_EPISODE');
const resolveExtension = getExtension('ALERTING_V2_RESOLVE_EPISODE');
const snoozeExtension = getExtension('ALERTING_V2_SNOOZE_EPISODE');
const unsnoozeExtension = getExtension('ALERTING_V2_UNSNOOZE_EPISODE');
const editTagsExtension = getExtension('ALERTING_V2_EDIT_EPISODE_TAGS');

describe('classicActionExtensions', () => {
  const http = httpServiceMock.createStartContract();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedBulkUpdate.mockResolvedValue(undefined);
    mockedBulkUpdateTags.mockResolvedValue(undefined);
    mockedBulkUntrack.mockResolvedValue(undefined);
    mockedBulkMute.mockResolvedValue(undefined);
    mockedBulkUnmute.mockResolvedValue(undefined);
    mockedSnooze.mockResolvedValue(undefined);
    mockedUnsnooze.mockResolvedValue(undefined);
  });

  describe('ack extension', () => {
    it('has the correct actionId', () => {
      expect(ackExtension.actionId).toBe('ALERTING_V2_ACK_EPISODE');
    });

    it('isCompatible returns true for open episodes', () => {
      expect(ackExtension.isCompatible(makeClassicEpisode('c1', 'open'))).toBe(true);
    });

    it('isCompatible returns false for already acknowledged episodes', () => {
      expect(ackExtension.isCompatible(makeClassicEpisode('c1', 'acknowledged'))).toBe(false);
    });

    it('execute calls bulkUpdateAlertWorkflowStatus with "acknowledged"', async () => {
      const episodes = [makeClassicEpisode('c1', 'open'), makeClassicEpisode('c2', 'open')];
      const result = await ackExtension.execute(episodes, http);

      expect(mockedBulkUpdate).toHaveBeenCalledWith({
        http,
        ids: ['c1', 'c2'],
        status: 'acknowledged',
        index: '.alerts-test',
      });
      expect(result).toEqual({ succeeded: 2, failed: 0, errors: [] });
    });

    it('execute groups episodes by index', async () => {
      const episodes = [
        makeClassicEpisode('c1', 'open', { index: '.alerts-obs' }),
        makeClassicEpisode('c2', 'open', { index: '.alerts-stack' }),
        makeClassicEpisode('c3', 'open', { index: '.alerts-obs' }),
      ];
      await ackExtension.execute(episodes, http);

      expect(mockedBulkUpdate).toHaveBeenCalledTimes(2);
      expect(mockedBulkUpdate).toHaveBeenCalledWith({
        http,
        ids: ['c1', 'c3'],
        status: 'acknowledged',
        index: '.alerts-obs',
      });
      expect(mockedBulkUpdate).toHaveBeenCalledWith({
        http,
        ids: ['c2'],
        status: 'acknowledged',
        index: '.alerts-stack',
      });
    });

    it('execute reports partial failure when one index group rejects', async () => {
      mockedBulkUpdate
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('forbidden'));

      const episodes = [
        makeClassicEpisode('c1', 'open', { index: '.alerts-obs' }),
        makeClassicEpisode('c2', 'open', { index: '.alerts-stack' }),
      ];
      const result = await ackExtension.execute(episodes, http);

      expect(result).toEqual({
        succeeded: 1,
        failed: 1,
        errors: ['forbidden'],
      });
    });
  });

  describe('unack extension', () => {
    it('has the correct actionId', () => {
      expect(unackExtension.actionId).toBe('ALERTING_V2_UNACK_EPISODE');
    });

    it('isCompatible returns true for acknowledged episodes', () => {
      expect(unackExtension.isCompatible(makeClassicEpisode('c1', 'acknowledged'))).toBe(true);
    });

    it('isCompatible returns false for non-acknowledged episodes', () => {
      expect(unackExtension.isCompatible(makeClassicEpisode('c1', 'open'))).toBe(false);
    });

    it('execute calls bulkUpdateAlertWorkflowStatus with "open"', async () => {
      const episodes = [makeClassicEpisode('c1', 'acknowledged')];
      const result = await unackExtension.execute(episodes, http);

      expect(mockedBulkUpdate).toHaveBeenCalledWith({
        http,
        ids: ['c1'],
        status: 'open',
        index: '.alerts-test',
      });
      expect(result).toEqual({ succeeded: 1, failed: 0, errors: [] });
    });
  });

  describe('resolve extension', () => {
    it('isCompatible returns true for active episodes', () => {
      expect(resolveExtension.isCompatible(makeClassicEpisode('c1', 'open'))).toBe(true);
    });

    it('isCompatible returns false for inactive episodes', () => {
      const ep = makeClassicEpisode('c1', 'open', {
        'episode.status': ALERT_EPISODE_STATUS.INACTIVE,
      });
      expect(resolveExtension.isCompatible(ep)).toBe(false);
    });

    it('execute calls bulkUntrackAlerts with flattened indices and alertUuids', async () => {
      const episodes = [
        makeClassicEpisode('c1', 'open', { index: '.alerts-obs' }),
        makeClassicEpisode('c2', 'open', { index: '.alerts-stack' }),
        makeClassicEpisode('c3', 'open', { index: '.alerts-obs' }),
      ];
      const result = await resolveExtension.execute(episodes, http);

      expect(mockedBulkUntrack).toHaveBeenCalledWith({
        http,
        indices: ['.alerts-obs', '.alerts-stack'],
        alertUuids: ['c1', 'c3', 'c2'],
      });
      expect(result).toEqual({ succeeded: 3, failed: 0 });
    });

    it('execute returns failure when bulkUntrackAlerts rejects', async () => {
      mockedBulkUntrack.mockRejectedValueOnce(new Error('untrack failed'));

      const episodes = [makeClassicEpisode('c1', 'open'), makeClassicEpisode('c2', 'open')];
      const result = await resolveExtension.execute(episodes, http);

      expect(result).toEqual({
        succeeded: 0,
        failed: 2,
        errors: ['untrack failed'],
      });
    });
  });

  describe('snooze extension', () => {
    it('isCompatible returns true when instanceId and ruleId are present and not snoozed', () => {
      expect(snoozeExtension.isCompatible(makeClassicEpisode('c1', 'open'))).toBe(true);
    });

    it('isCompatible returns false when already snoozed', () => {
      const ep = makeClassicEpisode('c1', 'open', {
        last_snooze_action: ALERT_EPISODE_ACTION_TYPE.SNOOZE,
        snooze_expiry: '2099-01-01T00:00:00.000Z',
      });
      expect(snoozeExtension.isCompatible(ep)).toBe(false);
    });

    it('isCompatible returns false when instanceId is missing', () => {
      const ep = makeClassicEpisode('c1', 'open', { instanceId: '' });
      expect(snoozeExtension.isCompatible(ep)).toBe(false);
    });

    it('execute with null expiry calls bulkMuteAlerts (indefinite mute)', async () => {
      const episodes = [
        makeClassicEpisode('c1', 'open'),
        makeClassicEpisode('c2', 'open', { ruleId: 'r2', instanceId: 'inst-2' }),
      ];
      const result = await snoozeExtension.execute(episodes, http, { expiry: null });

      expect(mockedBulkMute).toHaveBeenCalledWith({
        http,
        rules: [
          { rule_id: 'r1', alert_instance_ids: ['inst-1'] },
          { rule_id: 'r2', alert_instance_ids: ['inst-2'] },
        ],
      });
      expect(result).toEqual({ succeeded: 2, failed: 0, errors: [] });
    });

    it('execute with null expiry reports failure when bulkMuteAlerts rejects', async () => {
      mockedBulkMute.mockRejectedValueOnce(new Error('mute failed'));

      const episodes = [makeClassicEpisode('c1', 'open')];
      const result = await snoozeExtension.execute(episodes, http, { expiry: null });

      expect(result).toEqual({ succeeded: 0, failed: 1, errors: ['mute failed'] });
    });

    it('execute with expiry calls snoozeAlertInstance per episode sequentially within a rule', async () => {
      const callOrder: string[] = [];
      mockedSnooze.mockImplementation(async ({ instanceId }) => {
        callOrder.push(instanceId);
      });

      const episodes = [
        makeClassicEpisode('c1', 'open', { ruleId: 'r1', instanceId: 'inst-1' }),
        makeClassicEpisode('c2', 'open', { ruleId: 'r1', instanceId: 'inst-2' }),
      ];
      const result = await snoozeExtension.execute(episodes, http, {
        expiry: '2099-01-01T00:00:00.000Z',
      });

      expect(mockedSnooze).toHaveBeenCalledTimes(2);
      expect(callOrder).toEqual(['inst-1', 'inst-2']);
      expect(result).toEqual({ succeeded: 2, failed: 0, errors: [] });
    });

    it('execute with expiry reports partial failure', async () => {
      mockedSnooze
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('snooze failed'));

      const episodes = [
        makeClassicEpisode('c1', 'open', { instanceId: 'inst-1' }),
        makeClassicEpisode('c2', 'open', { instanceId: 'inst-2' }),
      ];
      const result = await snoozeExtension.execute(episodes, http, {
        expiry: '2099-01-01T00:00:00.000Z',
      });

      expect(result).toEqual({ succeeded: 1, failed: 1, errors: ['snooze failed'] });
    });
  });

  describe('unsnooze extension', () => {
    const makeSnoozedEpisode = (
      id: string,
      opts: {
        is_muted?: boolean;
        snooze_expiry?: string | null;
        instanceId?: string;
        ruleId?: string;
      } = {}
    ) =>
      makeClassicEpisode(id, 'open', {
        last_snooze_action: ALERT_EPISODE_ACTION_TYPE.SNOOZE,
        snooze_expiry: 'snooze_expiry' in opts ? opts.snooze_expiry : '2099-01-01T00:00:00.000Z',
        is_muted: opts.is_muted,
        instanceId: opts.instanceId ?? 'inst-1',
        ruleId: opts.ruleId ?? 'r1',
      });

    it('isCompatible returns true when snoozed', () => {
      const ep = makeSnoozedEpisode('c1');
      expect(unsnoozeExtension.isCompatible(ep)).toBe(true);
    });

    it('isCompatible returns false when not snoozed', () => {
      expect(unsnoozeExtension.isCompatible(makeClassicEpisode('c1', 'open'))).toBe(false);
    });

    it('execute unmutes muted-only episodes via bulkUnmuteAlerts', async () => {
      const ep = makeSnoozedEpisode('c1', { is_muted: true, snooze_expiry: null });
      const result = await unsnoozeExtension.execute([ep], http);

      expect(mockedBulkUnmute).toHaveBeenCalledWith({
        http,
        rules: [{ rule_id: 'r1', alert_instance_ids: ['inst-1'] }],
      });
      expect(mockedUnsnooze).not.toHaveBeenCalled();
      expect(result).toEqual({ succeeded: 1, failed: 0, errors: [] });
    });

    it('execute unsnoozes time-snoozed episodes via unsnoozeAlertInstance', async () => {
      const ep = makeSnoozedEpisode('c1', { snooze_expiry: '2099-01-01T00:00:00.000Z' });
      const result = await unsnoozeExtension.execute([ep], http);

      expect(mockedBulkUnmute).not.toHaveBeenCalled();
      expect(mockedUnsnooze).toHaveBeenCalledWith({
        http,
        id: 'r1',
        instanceId: 'inst-1',
      });
      expect(result).toEqual({ succeeded: 1, failed: 0, errors: [] });
    });

    it('execute handles both muted+snoozed: unmutes and unsnoozes, counts correctly', async () => {
      const ep = makeSnoozedEpisode('c1', {
        is_muted: true,
        snooze_expiry: '2099-01-01T00:00:00.000Z',
      });
      const result = await unsnoozeExtension.execute([ep], http);

      expect(mockedBulkUnmute).toHaveBeenCalled();
      expect(mockedUnsnooze).toHaveBeenCalled();
      // muted+snoozed: mutedOnlyCount = 0 (has snooze_expiry), so unmute adds 0.
      // unsnooze adds 1.
      expect(result).toEqual({ succeeded: 1, failed: 0, errors: [] });
    });

    it('execute counts muted-only and snoozed separately in a mixed batch', async () => {
      const mutedOnly = makeSnoozedEpisode('c1', {
        is_muted: true,
        snooze_expiry: null,
        instanceId: 'inst-1',
      });
      const snoozedOnly = makeSnoozedEpisode('c2', {
        snooze_expiry: '2099-01-01T00:00:00.000Z',
        instanceId: 'inst-2',
      });
      const result = await unsnoozeExtension.execute([mutedOnly, snoozedOnly], http);

      expect(mockedBulkUnmute).toHaveBeenCalled();
      expect(mockedUnsnooze).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ succeeded: 2, failed: 0, errors: [] });
    });

    it('execute reports failure when unmute rejects for muted-only episode', async () => {
      mockedBulkUnmute.mockRejectedValueOnce(new Error('unmute failed'));

      const ep = makeSnoozedEpisode('c1', { is_muted: true, snooze_expiry: null });
      const result = await unsnoozeExtension.execute([ep], http);

      expect(result).toEqual({ succeeded: 0, failed: 1, errors: ['unmute failed'] });
    });

    it('execute reports failure when unsnooze rejects', async () => {
      mockedUnsnooze.mockRejectedValueOnce(new Error('unsnooze failed'));

      const ep = makeSnoozedEpisode('c1');
      const result = await unsnoozeExtension.execute([ep], http);

      expect(result).toEqual({ succeeded: 0, failed: 1, errors: ['unsnooze failed'] });
    });
  });

  describe('edit tags extension', () => {
    it('isCompatible returns true for any episode', () => {
      expect(editTagsExtension.isCompatible(makeClassicEpisode('c1', 'open'))).toBe(true);
    });

    it('execute computes add/remove diff from current workflowTags', async () => {
      const episodes = [makeClassicEpisode('c1', 'open', { workflowTags: ['existing', 'old'] })];
      const result = await editTagsExtension.execute(episodes, http, {
        tags: ['existing', 'new'],
      });

      expect(mockedBulkUpdateTags).toHaveBeenCalledWith({
        http,
        alertIds: ['c1'],
        index: '.alerts-test',
        add: ['existing', 'new'],
        remove: ['old'],
      });
      expect(result).toEqual({ succeeded: 1, failed: 0, errors: [] });
    });

    it('execute returns early when no tags to add or remove', async () => {
      const episodes = [makeClassicEpisode('c1', 'open', { workflowTags: [] })];
      const result = await editTagsExtension.execute(episodes, http, { tags: [] });

      expect(mockedBulkUpdateTags).not.toHaveBeenCalled();
      expect(result).toEqual({ succeeded: 1, failed: 0 });
    });

    it('execute groups by index for multi-index episodes', async () => {
      const episodes = [
        makeClassicEpisode('c1', 'open', { index: '.alerts-obs', workflowTags: ['a'] }),
        makeClassicEpisode('c2', 'open', { index: '.alerts-stack', workflowTags: ['a'] }),
      ];
      await editTagsExtension.execute(episodes, http, { tags: ['a', 'b'] });

      expect(mockedBulkUpdateTags).toHaveBeenCalledTimes(2);
      expect(mockedBulkUpdateTags).toHaveBeenCalledWith(
        expect.objectContaining({ alertIds: ['c1'], index: '.alerts-obs' })
      );
      expect(mockedBulkUpdateTags).toHaveBeenCalledWith(
        expect.objectContaining({ alertIds: ['c2'], index: '.alerts-stack' })
      );
    });

    it('execute reports partial failure', async () => {
      mockedBulkUpdateTags
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('tag update failed'));

      const episodes = [
        makeClassicEpisode('c1', 'open', { index: '.alerts-obs', workflowTags: [] }),
        makeClassicEpisode('c2', 'open', { index: '.alerts-stack', workflowTags: [] }),
      ];
      const result = await editTagsExtension.execute(episodes, http, { tags: ['new'] });

      expect(result).toEqual({
        succeeded: 1,
        failed: 1,
        errors: ['tag update failed'],
      });
    });
  });
});
