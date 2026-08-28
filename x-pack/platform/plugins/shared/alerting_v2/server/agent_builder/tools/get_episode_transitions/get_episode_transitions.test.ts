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
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type { EpisodeTransitionEsqlRow } from '@kbn/alerting-v2-common-queries';
import type { EpisodesClient } from '../../../lib/episodes_client';
import type { PrivilegeChecker } from '../../../lib/services/privilege_checker/privilege_checker';
import { getEpisodeTransitionsTool, getEpisodeTransitionsToolId } from './get_episode_transitions';

const transitions: EpisodeTransitionEsqlRow[] = [
  {
    'episode.id': 'ep-1',
    'rule.id': 'rule-1',
    group_hash: 'gh-1',
    status_started_at: '2026-04-10T11:00:00.000Z',
    previous_status: null,
    episode_status: ALERT_EPISODE_STATUS.ACTIVE,
    duration_ms: 3_600_000,
    status_ended_at: '2026-04-10T12:00:00.000Z',
    data: { host: 'web-01' },
  },
  {
    'episode.id': 'ep-1',
    'rule.id': 'rule-1',
    group_hash: 'gh-1',
    status_started_at: '2026-04-10T12:00:00.000Z',
    previous_status: ALERT_EPISODE_STATUS.ACTIVE,
    episode_status: ALERT_EPISODE_STATUS.INACTIVE,
    duration_ms: 0,
    status_ended_at: null,
    data: {},
  },
];

describe('getEpisodeTransitionsTool', () => {
  let loggerService: ReturnType<typeof createLoggerService>['loggerService'];
  let mockLogger: ReturnType<typeof createLoggerService>['mockLogger'];
  let getEpisodeTransitions: jest.Mock;
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
    getEpisodeTransitions = jest.fn();
  });

  const createTool = (canReadResult: boolean = true) =>
    getEpisodeTransitionsTool({
      attachmentId: 'attach-1',
      episodeId: 'ep-1',
      logger: loggerService,
      getEpisodesClient: () => ({ getEpisodeTransitions } as unknown as EpisodesClient),
      getPrivilegeChecker: () => createPrivilegeCheckerMock(canReadResult),
    });

  describe('id', () => {
    it('is unique per attachment instance', () => {
      expect(getEpisodeTransitionsToolId('attach-1')).toBe(
        'platform.alerting.get_episode_transitions.attach-1'
      );
      expect(createTool().id).toBe(getEpisodeTransitionsToolId('attach-1'));
    });
  });

  describe('definition', () => {
    it('is a builtin tool with an empty schema', () => {
      const tool = createTool();
      expect(tool.type).toBe(ToolType.builtin);
      expect(tool.description).toContain('ep-1');
      expect(tool.description).toContain('attach-1');
      expect(tool.description).toContain('status transitions');
      expect(tool.schema.safeParse({}).success).toBe(true);
    });
  });

  describe('handler', () => {
    it('returns status transitions for the episode', async () => {
      getEpisodeTransitions.mockResolvedValueOnce(transitions);

      const result = await createTool().handler({}, agentBuilderMocks.tools.createHandlerContext());

      expect(getEpisodeTransitions).toHaveBeenCalledWith('ep-1');
      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: { transitions },
          },
        ],
      });
    });

    it('returns an empty list when the episode has no transitions', async () => {
      getEpisodeTransitions.mockResolvedValueOnce([]);

      const result = await createTool().handler({}, agentBuilderMocks.tools.createHandlerContext());

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: { transitions: [] },
          },
        ],
      });
    });

    it('returns an error when getEpisodeTransitions throws', async () => {
      getEpisodeTransitions.mockRejectedValueOnce(new Error('boom'));

      const result = await createTool().handler({}, agentBuilderMocks.tools.createHandlerContext());

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.error,
            data: { message: 'Failed to fetch transitions for episode "ep-1": boom' },
          },
        ],
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to fetch episode transitions',
        expect.objectContaining({
          labels: {
            episode_id: 'ep-1',
            space_id: 'default',
            code: ALERTING_LOG_CODES.AGENT_BUILDER_EPISODE_GET_TRANSITIONS_FAILED,
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

      expect(getEpisodeTransitions).not.toHaveBeenCalled();
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

    it('checks Alerts: Read before fetching', async () => {
      getEpisodeTransitions.mockResolvedValueOnce(transitions);

      await createTool().handler({}, agentBuilderMocks.tools.createHandlerContext());

      expect(canRead).toHaveBeenCalledWith('alerts');
    });
  });
});
