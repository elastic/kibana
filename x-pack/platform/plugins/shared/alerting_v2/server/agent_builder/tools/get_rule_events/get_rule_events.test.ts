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
import type { EpisodeEventRow } from '@kbn/alerting-v2-common-queries';
import type { EpisodesClient } from '../../../lib/episodes_client';
import type { PrivilegeChecker } from '../../../lib/services/privilege_checker/privilege_checker';
import { getRuleEventsTool, getRuleEventsToolId } from './get_rule_events';

const episode: AlertEpisode = {
  '@timestamp': '2026-04-10T12:00:00.000Z',
  'episode.id': 'ep-1',
  'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
  'rule.id': 'rule-1',
  group_hash: 'gh-1',
  first_timestamp: '2026-04-10T11:00:00.000Z',
  last_timestamp: '2026-04-10T12:00:00.000Z',
  duration: 3600000,
};

const eventRow: EpisodeEventRow = {
  '@timestamp': '2026-04-10T11:30:00.000Z',
  'episode.id': 'ep-1',
  'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
  'rule.id': 'rule-1',
  group_hash: 'gh-1',
  severity: 'high',
  source: 'threshold',
  data: { cpu: 90 },
};

const validArgs = {
  start: '2026-04-10T11:00:00.000Z',
  end: '2026-04-10T12:00:00.000Z',
};

describe('getRuleEventsTool', () => {
  let loggerService: ReturnType<typeof createLoggerService>['loggerService'];
  let mockLogger: ReturnType<typeof createLoggerService>['mockLogger'];
  let get: jest.Mock;
  let getEvents: jest.Mock;
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
    getEvents = jest.fn();
  });

  const createTool = (canReadResult: boolean = true) =>
    getRuleEventsTool({
      attachmentId: 'attach-1',
      episodeId: 'ep-1',
      logger: loggerService,
      getEpisodesClient: () => ({ get, getEvents } as unknown as EpisodesClient),
      getPrivilegeChecker: () => createPrivilegeCheckerMock(canReadResult),
    });

  describe('id', () => {
    it('is unique per attachment instance', () => {
      expect(getRuleEventsToolId('attach-1')).toBe('platform.alerting.get_rule_events.attach-1');
      expect(createTool().id).toBe(getRuleEventsToolId('attach-1'));
    });
  });

  describe('definition', () => {
    it('is a builtin read-only tool scoped to the attached episode', () => {
      const tool = createTool();
      expect(tool.type).toBe(ToolType.builtin);
      expect(tool.description).toContain('ep-1');
      expect(tool.description).toContain('attach-1');
      expect(tool.description).toContain('read-only');
      expect(tool.description).toContain('episode.status');
      expect(tool.description).toContain('or status to filter');
      expect(tool.description).not.toContain('or episode.status to filter');
      expect(tool.description).toContain('no arguments');
      expect(tool.description).toContain('100 rows');
      expect(tool.description).toContain('event data');
      expect(tool.schema.safeParse(validArgs).success).toBe(true);
      expect(tool.schema.safeParse({}).success).toBe(true);
      expect(tool.schema.safeParse({ start: validArgs.start }).success).toBe(false);
      expect(tool.schema.safeParse({ end: validArgs.end }).success).toBe(false);
    });
  });

  describe('handler', () => {
    it('fetches the episode window when called with no arguments', async () => {
      getEvents.mockResolvedValueOnce([eventRow]);

      const result = await createTool().handler({}, agentBuilderMocks.tools.createHandlerContext());

      expect(getEvents).toHaveBeenCalledWith('ep-1', { limit: 101 });
      expect(get).not.toHaveBeenCalled();
      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: {
              events: [eventRow],
              count: 1,
              truncated: false,
            },
          },
        ],
      });
    });

    it('returns matching rule events', async () => {
      getEvents.mockResolvedValueOnce([eventRow]);

      const result = await createTool().handler(
        validArgs,
        agentBuilderMocks.tools.createHandlerContext()
      );

      expect(getEvents).toHaveBeenCalledWith('ep-1', {
        timeRange: validArgs,
        limit: 101,
      });
      expect(get).not.toHaveBeenCalled();
      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: {
              events: [eventRow],
              count: 1,
              truncated: false,
            },
          },
        ],
      });
    });

    it('parses JSON-string event data for the agent', async () => {
      getEvents.mockResolvedValueOnce([{ ...eventRow, data: '{"host.name":"web-01","cpu":72}' }]);

      const result = await createTool().handler(
        validArgs,
        agentBuilderMocks.tools.createHandlerContext()
      );

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: {
              events: [{ ...eventRow, data: { 'host.name': 'web-01', cpu: 72 } }],
              count: 1,
              truncated: false,
            },
          },
        ],
      });
    });

    it('parses JSON-array event data for the agent', async () => {
      getEvents.mockResolvedValueOnce([{ ...eventRow, data: '["tag1","tag2"]' }]);

      const result = await createTool().handler(
        validArgs,
        agentBuilderMocks.tools.createHandlerContext()
      );

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: {
              events: [{ ...eventRow, data: ['tag1', 'tag2'] }],
              count: 1,
              truncated: false,
            },
          },
        ],
      });
    });

    it('does not set truncated when the result fills the page exactly', async () => {
      getEvents.mockResolvedValueOnce(
        Array.from({ length: 100 }, (_, i) => ({
          ...eventRow,
          '@timestamp': `2026-04-10T11:${String(i % 60).padStart(2, '0')}:00.000Z`,
        }))
      );

      const result = await createTool().handler(
        validArgs,
        agentBuilderMocks.tools.createHandlerContext()
      );

      expect(result).toEqual({
        results: [
          expect.objectContaining({
            data: expect.objectContaining({
              count: 100,
              truncated: false,
            }),
          }),
        ],
      });
    });

    it('sets truncated and returns the page when one extra row is fetched', async () => {
      getEvents.mockResolvedValueOnce(
        Array.from({ length: 101 }, (_, i) => ({
          ...eventRow,
          '@timestamp': `2026-04-10T11:${String(i % 60).padStart(2, '0')}:00.000Z`,
        }))
      );

      const result = await createTool().handler(
        validArgs,
        agentBuilderMocks.tools.createHandlerContext()
      );

      expect(result).toEqual({
        results: [
          expect.objectContaining({
            data: expect.objectContaining({
              count: 100,
              truncated: true,
            }),
          }),
        ],
      });
    });

    it('returns an empty list when the episode exists but has no events in range', async () => {
      getEvents.mockResolvedValueOnce([]);
      get.mockResolvedValueOnce(episode);

      const result = await createTool().handler(
        validArgs,
        agentBuilderMocks.tools.createHandlerContext()
      );

      expect(get).toHaveBeenCalledWith('ep-1');
      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: {
              events: [],
              count: 0,
              truncated: false,
            },
          },
        ],
      });
    });

    it('forwards an optional episode.status filter', async () => {
      getEvents.mockResolvedValueOnce([]);
      get.mockResolvedValueOnce(episode);

      await createTool().handler(
        { ...validArgs, status: ALERT_EPISODE_STATUS.ACTIVE },
        agentBuilderMocks.tools.createHandlerContext()
      );

      expect(getEvents).toHaveBeenCalledWith('ep-1', {
        timeRange: validArgs,
        status: ALERT_EPISODE_STATUS.ACTIVE,
        limit: 101,
      });
    });

    it('rejects a start without an end at the schema', () => {
      const parsed = createTool().schema.safeParse({ start: validArgs.start });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0]?.message).toBe('start and end must both be provided');
      }
    });

    it('returns an error when start is after end', async () => {
      const result = await createTool().handler(
        { start: validArgs.end, end: validArgs.start },
        agentBuilderMocks.tools.createHandlerContext()
      );

      expect(get).not.toHaveBeenCalled();
      expect(getEvents).not.toHaveBeenCalled();
      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.error,
            data: { message: 'start must be less than or equal to end' },
          },
        ],
      });
    });

    it('returns an error when the episode is missing', async () => {
      getEvents.mockResolvedValueOnce([]);
      get.mockResolvedValueOnce(undefined);

      const result = await createTool().handler(
        validArgs,
        agentBuilderMocks.tools.createHandlerContext()
      );

      expect(getEvents).toHaveBeenCalled();
      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.error,
            data: { message: 'Episode "ep-1" not found' },
          },
        ],
      });
    });

    it('returns an error and logs a warning when getEvents throws', async () => {
      getEvents.mockRejectedValueOnce(new Error('boom'));

      const result = await createTool().handler(
        validArgs,
        agentBuilderMocks.tools.createHandlerContext()
      );

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: 'Failed to fetch rule events for episode "ep-1": boom',
            },
          },
        ],
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to fetch rule events for episode',
        expect.objectContaining({
          labels: {
            episode_id: 'ep-1',
            space_id: 'default',
            code: ALERTING_LOG_CODES.AGENT_BUILDER_EPISODE_GET_RULE_EVENTS_FAILED,
          },
          error: expect.objectContaining({
            message: 'boom',
            type: 'Error',
          }),
        })
      );
    });

    it('returns an error and logs a warning when the existence lookup throws', async () => {
      getEvents.mockResolvedValueOnce([]);
      get.mockRejectedValueOnce(new Error('timeout'));

      const result = await createTool().handler(
        validArgs,
        agentBuilderMocks.tools.createHandlerContext()
      );

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: 'Failed to look up episode "ep-1": timeout',
            },
          },
        ],
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to look up episode while fetching rule events',
        expect.objectContaining({
          labels: {
            episode_id: 'ep-1',
            space_id: 'default',
            code: ALERTING_LOG_CODES.AGENT_BUILDER_EPISODE_LOOKUP_FAILED,
          },
          error: expect.objectContaining({
            message: 'timeout',
            type: 'Error',
          }),
        })
      );
    });

    it('returns an unauthorized error when user lacks Alerts: Read', async () => {
      const result = await createTool(false).handler(
        validArgs,
        agentBuilderMocks.tools.createHandlerContext()
      );

      expect(get).not.toHaveBeenCalled();
      expect(getEvents).not.toHaveBeenCalled();
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
      getEvents.mockResolvedValueOnce([]);
      get.mockResolvedValueOnce(episode);

      await createTool().handler(validArgs, agentBuilderMocks.tools.createHandlerContext());

      expect(canRead).toHaveBeenCalledWith('alerts');
    });
  });
});
