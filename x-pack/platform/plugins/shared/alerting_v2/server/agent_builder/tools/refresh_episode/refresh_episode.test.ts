/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { ToolType } from '@kbn/agent-builder-common';
import {
  ALERT_EPISODE_STATUS,
  type AlertEpisode,
  type EpisodeAttachmentData,
} from '@kbn/alerting-v2-schemas';
import type { EpisodesClient } from '../../../lib/episodes_client';
import { refreshEpisodeTool, refreshEpisodeToolId } from './refresh_episode';

const baseEpisodeData: EpisodeAttachmentData = {
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

describe('refreshEpisodeTool', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let get: jest.Mock;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    get = jest.fn();
  });

  const createTool = () =>
    refreshEpisodeTool({
      attachmentId: 'attach-1',
      episodeId: 'ep-1',
      logger,
      getEpisodesClient: () => ({ get } as unknown as EpisodesClient),
    });

  describe('id', () => {
    it('is unique per attachment instance', () => {
      expect(refreshEpisodeToolId('attach-1')).toBe('platform.alerting.refresh_episode.attach-1');
      expect(createTool().id).toBe(refreshEpisodeToolId('attach-1'));
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
    it('returns the latest episode snapshot', async () => {
      const refreshed: AlertEpisode = {
        ...baseEpisodeData,
        'episode.status': ALERT_EPISODE_STATUS.INACTIVE,
        last_timestamp: '2026-04-20T12:00:00.000Z',
        severity: 'low',
      };
      get.mockResolvedValueOnce(refreshed);

      const result = await createTool().handler(
        {},
        agentBuilderMocks.tools.createHandlerContext()
      );

      expect(get).toHaveBeenCalledWith('ep-1');
      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: expect.objectContaining({
              'episode.id': 'ep-1',
              'episode.status': ALERT_EPISODE_STATUS.INACTIVE,
              last_timestamp: '2026-04-20T12:00:00.000Z',
              severity: 'low',
            }),
          },
        ],
      });
    });

    it('normalizes null nullable fields', async () => {
      const episodeWithNulls: AlertEpisode = {
        ...baseEpisodeData,
        last_assignee_uid: null,
        episode_data: null,
        severity: null,
      };
      get.mockResolvedValueOnce(episodeWithNulls);

      const result = await createTool().handler(
        {},
        agentBuilderMocks.tools.createHandlerContext()
      );

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: expect.objectContaining({
              'episode.id': 'ep-1',
              last_assignee_uid: undefined,
              episode_data: undefined,
              severity: undefined,
            }),
          },
        ],
      });
    });

    it('returns an error when the episode is missing', async () => {
      get.mockResolvedValueOnce(undefined);

      const result = await createTool().handler(
        {},
        agentBuilderMocks.tools.createHandlerContext()
      );

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

      const result = await createTool().handler(
        {},
        agentBuilderMocks.tools.createHandlerContext()
      );

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.error,
            data: { message: 'Failed to refresh episode "ep-1": boom' },
          },
        ],
      });
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to refresh episode "ep-1"')
      );
    });
  });
});
