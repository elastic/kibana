/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLoggerService } from '../../../lib/services/logger_service/logger_service.mock';
import { ALERTING_LOG_CODES } from '../../../lib/errors/error_codes';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { ToolType } from '@kbn/agent-builder-common';
import { ALERT_EPISODE_STATUS, type AlertEpisode } from '@kbn/alerting-v2-schemas';
import type { EpisodesClient } from '../../../lib/episodes_client';
import type { RulesClient } from '../../../lib/rules_client';
import type { PrivilegeChecker } from '../../../lib/services/privilege_checker/privilege_checker';
import { refreshAlertTool, refreshAlertToolId } from './refresh_alert';

const baseEpisodeRow: AlertEpisode = {
  '@timestamp': '2026-04-10T12:00:00.000Z',
  'episode.id': 'ep-1',
  'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
  'rule.id': 'rule-1',
  group_hash: 'gh-1',
  first_timestamp: '2026-04-10T11:00:00.000Z',
  last_timestamp: '2026-04-10T12:00:00.000Z',
  duration: 3600000,
  severity: 'high',
  last_tags: ['ops'],
};

describe('refreshAlertTool', () => {
  let loggerService: ReturnType<typeof createLoggerService>['loggerService'];
  let mockLogger: ReturnType<typeof createLoggerService>['mockLogger'];
  let get: jest.Mock;
  let getRule: jest.Mock;
  let canRead: jest.Mock;

  const createPrivilegeCheckerMock = (canReadResult: boolean = true) => {
    canRead = jest.fn().mockResolvedValue(canReadResult);
    return {
      canRead,
      canWrite: jest.fn().mockResolvedValue(true),
    } as unknown as PrivilegeChecker;
  };

  beforeEach(() => {
    ({ loggerService, mockLogger } = createLoggerService());
    get = jest.fn();
    getRule = jest.fn();
  });

  const createTool = (canReadResult: boolean = true) =>
    refreshAlertTool({
      attachmentId: 'attach-1',
      alertId: 'ep-1',
      logger: loggerService,
      getEpisodesClient: () => ({ get } as unknown as EpisodesClient),
      getRulesClient: () => ({ getRule } as unknown as RulesClient),
      getPrivilegeChecker: () => createPrivilegeCheckerMock(canReadResult),
    });

  describe('id', () => {
    it('is unique per attachment instance', () => {
      expect(refreshAlertToolId('attach-1')).toBe('platform.alerting.refresh_alert.attach-1');
      expect(createTool().id).toBe(refreshAlertToolId('attach-1'));
    });
  });

  describe('definition', () => {
    it('is a builtin tool with an empty schema', () => {
      const tool = createTool();
      expect(tool.type).toBe(ToolType.builtin);
      expect(tool.description).toContain('ep-1');
      expect(tool.description).toContain('attach-1');
      expect(tool.schema.safeParse({}).success).toBe(true);
    });
  });

  describe('handler', () => {
    it('returns the latest alert snapshot', async () => {
      const refreshed: AlertEpisode = {
        ...baseEpisodeRow,
        'episode.status': ALERT_EPISODE_STATUS.INACTIVE,
        last_timestamp: '2026-04-20T12:00:00.000Z',
        severity: 'low',
      };
      get.mockResolvedValueOnce(refreshed);

      const result = await createTool().handler({}, agentBuilderMocks.tools.createHandlerContext());

      expect(get).toHaveBeenCalledWith('ep-1');
      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: expect.objectContaining({
              'alert.id': 'ep-1',
              'alert.status': ALERT_EPISODE_STATUS.INACTIVE,
              last_timestamp: '2026-04-20T12:00:00.000Z',
              severity: 'low',
            }),
          },
        ],
      });
    });

    it('includes the alert label when the rule can be loaded', async () => {
      get.mockResolvedValueOnce(baseEpisodeRow);
      getRule.mockResolvedValueOnce({ metadata: { name: 'Host CPU high' } });

      const result = await createTool().handler({}, agentBuilderMocks.tools.createHandlerContext());

      expect(getRule).toHaveBeenCalledWith({ id: 'rule-1' });
      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: expect.objectContaining({ 'alert.label': 'Host CPU high alert' }),
          },
        ],
      });
    });

    it('includes the rule name and group when both are available', async () => {
      get.mockResolvedValueOnce({
        ...baseEpisodeRow,
        episode_data: JSON.stringify({ host: { name: 'web-01' } }),
      });
      getRule.mockResolvedValueOnce({
        metadata: { name: 'Host CPU high' },
        grouping: { fields: ['host.name'] },
      });

      const result = await createTool().handler({}, agentBuilderMocks.tools.createHandlerContext());

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: expect.objectContaining({ 'alert.label': 'Host CPU high alert for web-01' }),
          },
        ],
      });
    });

    it('falls back to rule ID label when the rule cannot be loaded and there is no group name', async () => {
      get.mockResolvedValueOnce(baseEpisodeRow);
      getRule.mockRejectedValueOnce(new Error('not found'));

      const result = await createTool().handler({}, agentBuilderMocks.tools.createHandlerContext());

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: expect.objectContaining({ 'alert.label': 'Alert for rule rule-1' }),
          },
        ],
      });
    });

    it('falls back to rule ID label when the rule cannot be loaded and grouping fields are unknown', async () => {
      get.mockResolvedValueOnce({
        ...baseEpisodeRow,
        episode_data: JSON.stringify({ host: { name: 'web-01' } }),
      });
      getRule.mockRejectedValueOnce(new Error('not found'));

      const result = await createTool().handler({}, agentBuilderMocks.tools.createHandlerContext());

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: expect.objectContaining({ 'alert.label': 'Alert for rule rule-1' }),
          },
        ],
      });
    });

    it('normalizes null optional fields', async () => {
      const episodeWithNulls: AlertEpisode = {
        ...baseEpisodeRow,
        last_ack_action: null,
        last_assignee_uid: null,
        last_snooze_action: null,
        snooze_expiry: null,
        last_tags: null,
        episode_data: null,
        severity: null,
      };
      get.mockResolvedValueOnce(episodeWithNulls);

      const result = await createTool().handler({}, agentBuilderMocks.tools.createHandlerContext());

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: expect.objectContaining({
              'alert.id': 'ep-1',
              last_ack_action: undefined,
              last_assignee_uid: undefined,
              last_snooze_action: undefined,
              snooze_expiry: undefined,
              last_tags: undefined,
              alert_data: undefined,
              severity: undefined,
            }),
          },
        ],
      });
    });

    it('returns an error when the alert is missing', async () => {
      get.mockResolvedValueOnce(undefined);

      const result = await createTool().handler({}, agentBuilderMocks.tools.createHandlerContext());

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.error,
            data: { message: 'Episode "ep-1" not found' },
          },
        ],
      });
    });

    it('returns an error when get throws', async () => {
      get.mockRejectedValueOnce(new Error('boom'));

      const result = await createTool().handler({}, agentBuilderMocks.tools.createHandlerContext());

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.error,
            data: { message: 'Failed to refresh episode "ep-1": boom' },
          },
        ],
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to refresh episode',
        expect.objectContaining({
          labels: {
            episode_id: 'ep-1',
            space_id: 'default',
            code: ALERTING_LOG_CODES.AGENT_BUILDER_EPISODE_REFRESH_FAILED,
          },
          error: expect.objectContaining({
            message: 'boom',
            type: 'Error',
          }),
        })
      );
    });

    it('returns an unauthorized error when user lacks Alerts: Read', async () => {
      const result = await createTool(false).handler(
        {},
        agentBuilderMocks.tools.createHandlerContext()
      );

      expect(get).not.toHaveBeenCalled();
      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: expect.stringContaining('Missing Kibana privilege: Alerts: Read'),
              metadata: { missingPrivileges: ['Alerts: Read'] },
            },
          },
        ],
      });
    });

    it('checks Alerts: Read before refreshing', async () => {
      get.mockResolvedValueOnce(baseEpisodeRow);

      await createTool().handler({}, agentBuilderMocks.tools.createHandlerContext());

      expect(canRead).toHaveBeenCalledWith('alerts');
    });
  });
});
