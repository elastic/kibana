/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { bulkUpdateAlertWorkflowStatus } from '@kbn/response-ops-alerts-apis/apis/bulk_update_alert_workflow_status';
import type { AlertEpisode } from '../queries/episodes_query';
import type { ClassicAlertActionContext } from './utils/map_alert';
import { classicActionExtensions } from './action_extensions';

jest.mock('@kbn/response-ops-alerts-apis/apis/bulk_update_alert_workflow_status');

const mockedBulkUpdate = bulkUpdateAlertWorkflowStatus as jest.MockedFunction<
  typeof bulkUpdateAlertWorkflowStatus
>;

const makeClassicEpisode = (
  id: string,
  workflowStatus: string,
  index = '.alerts-test'
): AlertEpisode =>
  ({
    '@timestamp': '2026-04-23T00:00:00Z',
    'episode.id': id,
    'episode.status': 'active',
    'rule.id': 'r1',
    group_hash: id,
    first_timestamp: '2026-04-23T00:00:00Z',
    last_timestamp: '2026-04-23T00:00:00Z',
    duration: 0,
    source_id: 'classic-alerts',
    source_action_context: {
      index,
      alertUuid: id,
      instanceId: 'inst-1',
      ruleId: 'r1',
      workflowStatus,
      workflowTags: [],
    } as ClassicAlertActionContext,
  } as AlertEpisode);

const ackExtension = classicActionExtensions.find(
  (ext) => ext.actionId === 'ALERTING_V2_ACK_EPISODE'
)!;

const unackExtension = classicActionExtensions.find(
  (ext) => ext.actionId === 'ALERTING_V2_UNACK_EPISODE'
)!;

describe('classicActionExtensions', () => {
  const http = httpServiceMock.createStartContract();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedBulkUpdate.mockResolvedValue(undefined);
  });

  describe('ack extension', () => {
    it('has the correct actionId', () => {
      expect(ackExtension.actionId).toBe('ALERTING_V2_ACK_EPISODE');
    });

    it('isCompatible returns true for non-acknowledged episodes', () => {
      expect(ackExtension.isCompatible(makeClassicEpisode('c1', 'open'))).toBe(true);
      expect(ackExtension.isCompatible(makeClassicEpisode('c2', 'in-progress'))).toBe(true);
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
        makeClassicEpisode('c1', 'open', '.alerts-obs'),
        makeClassicEpisode('c2', 'open', '.alerts-sec'),
        makeClassicEpisode('c3', 'open', '.alerts-obs'),
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
        index: '.alerts-sec',
      });
    });

    it('execute reports partial failure when one index group rejects', async () => {
      mockedBulkUpdate
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('forbidden'));

      const episodes = [
        makeClassicEpisode('c1', 'open', '.alerts-obs'),
        makeClassicEpisode('c2', 'open', '.alerts-sec'),
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
});
