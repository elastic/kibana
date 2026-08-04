/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import type {
  Attachment,
  VersionedAttachmentWithOrigin,
} from '@kbn/agent-builder-common/attachments';
import {
  ALERT_EPISODE_STATUS,
  EPISODE_ATTACHMENT_TYPE,
  type AlertEpisode,
  type EpisodeAttachmentData,
} from '@kbn/alerting-v2-schemas';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { EpisodesClient } from '../../lib/episodes_client';
import type { RulesClient } from '../../lib/rules_client';
import { getRuleToolId } from '../tools/get_rule';
import { refreshEpisodeToolId } from '../tools/refresh_episode';
import { createEpisodeAttachmentType } from './episode_attachment_type';

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

type EpisodeVersionedAttachment = VersionedAttachmentWithOrigin<
  typeof EPISODE_ATTACHMENT_TYPE,
  EpisodeAttachmentData
>;

const buildVersionedAttachment = (
  overrides: Partial<EpisodeVersionedAttachment> = {}
): EpisodeVersionedAttachment => ({
  id: 'attach-1',
  type: EPISODE_ATTACHMENT_TYPE,
  current_version: 1,
  versions: [
    {
      version: 1,
      data: baseEpisodeData,
      created_at: '2026-04-10T12:00:00.000Z',
    } as never,
  ],
  origin: 'ep-1',
  origin_snapshot_at: '2026-04-10T12:00:00.000Z',
  ...overrides,
});

describe('createEpisodeAttachmentType', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let get: jest.Mock;
  let getRule: jest.Mock;
  let definition: AttachmentTypeDefinition<typeof EPISODE_ATTACHMENT_TYPE, EpisodeAttachmentData>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    get = jest.fn();
    getRule = jest.fn();
    const episodesClient = { get } as unknown as EpisodesClient;
    const rulesClient = { getRule } as unknown as RulesClient;
    definition = createEpisodeAttachmentType({
      logger,
      getEpisodesClient: () => episodesClient,
      getRulesClient: () => rulesClient,
    });
  });

  describe('id', () => {
    it('uses the shared EPISODE_ATTACHMENT_TYPE constant', () => {
      expect(definition.id).toBe(EPISODE_ATTACHMENT_TYPE);
    });
  });

  describe('validate', () => {
    it('returns valid result when input matches schema', async () => {
      const result = await definition.validate(baseEpisodeData);
      expect(result).toEqual({
        valid: true,
        data: expect.objectContaining({ 'episode.id': 'ep-1' }),
      });
    });

    it('returns invalid result when input is missing required fields', async () => {
      const result = await definition.validate({ foo: 'bar' });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toEqual(expect.any(String));
      }
    });
  });

  describe('resolve', () => {
    it('returns episode data parsed against the schema', async () => {
      get.mockResolvedValueOnce(baseEpisodeData);

      const result = await definition.resolve!(
        'ep-1',
        agentBuilderMocks.attachments.createResolveContextMock()
      );

      expect(get).toHaveBeenCalledWith('ep-1');
      expect(result).toEqual(expect.objectContaining({ 'episode.id': 'ep-1' }));
    });

    it('normalizes null nullable fields via alertEpisodeToEpisodeAttachment', async () => {
      const episodeWithNulls: AlertEpisode = {
        ...baseEpisodeData,
        last_assignee_uid: null,
        episode_data: null,
        severity: null,
      };
      get.mockResolvedValueOnce(episodeWithNulls);

      const result = await definition.resolve!(
        'ep-1',
        agentBuilderMocks.attachments.createResolveContextMock()
      );

      expect(result).toEqual(
        expect.objectContaining({
          'episode.id': 'ep-1',
          last_assignee_uid: undefined,
          episode_data: undefined,
          severity: undefined,
        })
      );
    });

    it('returns undefined when the episode does not exist', async () => {
      get.mockResolvedValueOnce(undefined);

      const result = await definition.resolve!(
        'ep-missing',
        agentBuilderMocks.attachments.createResolveContextMock()
      );

      expect(result).toBeUndefined();
    });

    it('returns undefined and logs a warning when get throws', async () => {
      get.mockRejectedValueOnce(new Error('boom'));

      const result = await definition.resolve!(
        'ep-missing',
        agentBuilderMocks.attachments.createResolveContextMock()
      );

      expect(result).toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to resolve episode attachment for origin "ep-missing"')
      );
    });
  });

  describe('isStale', () => {
    it('returns false when origin_snapshot_at is missing', async () => {
      const attachment = buildVersionedAttachment({ origin_snapshot_at: undefined });

      const result = await definition.isStale!(
        attachment,
        agentBuilderMocks.attachments.createResolveContextMock()
      );

      expect(result).toBe(false);
      expect(get).not.toHaveBeenCalled();
    });

    it('returns false when last_timestamp equals snapshot time', async () => {
      get.mockResolvedValueOnce({
        ...baseEpisodeData,
        last_timestamp: '2026-04-10T12:00:00.000Z',
      });

      const result = await definition.isStale!(
        buildVersionedAttachment(),
        agentBuilderMocks.attachments.createResolveContextMock()
      );

      expect(result).toBe(false);
    });

    it('returns false when last_timestamp is before snapshot time', async () => {
      get.mockResolvedValueOnce({
        ...baseEpisodeData,
        last_timestamp: '2026-04-09T12:00:00.000Z',
      });

      const result = await definition.isStale!(
        buildVersionedAttachment(),
        agentBuilderMocks.attachments.createResolveContextMock()
      );

      expect(result).toBe(false);
    });

    it('returns true when last_timestamp is after snapshot AND differs from latest version', async () => {
      get.mockResolvedValueOnce({
        ...baseEpisodeData,
        last_timestamp: '2026-04-20T12:00:00.000Z',
      });

      const result = await definition.isStale!(
        buildVersionedAttachment(),
        agentBuilderMocks.attachments.createResolveContextMock()
      );

      expect(result).toBe(true);
    });

    it('returns false when last_timestamp is after snapshot but matches latest version', async () => {
      const sameTimestamp = '2026-04-15T12:00:00.000Z';
      get.mockResolvedValueOnce({ ...baseEpisodeData, last_timestamp: sameTimestamp });
      const attachment = buildVersionedAttachment({
        versions: [
          {
            version: 1,
            data: { ...baseEpisodeData, last_timestamp: sameTimestamp },
            created_at: '2026-04-15T12:00:00.000Z',
          } as never,
        ],
      });

      const result = await definition.isStale!(
        attachment,
        agentBuilderMocks.attachments.createResolveContextMock()
      );

      expect(result).toBe(false);
    });

    it('returns false and logs a warning when get throws', async () => {
      get.mockRejectedValueOnce(new Error('boom'));

      const result = await definition.isStale!(
        buildVersionedAttachment(),
        agentBuilderMocks.attachments.createResolveContextMock()
      );

      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to check staleness for episode attachment "ep-1"')
      );
    });
  });

  describe('format', () => {
    const buildAttachment = (
      data: EpisodeAttachmentData
    ): Attachment<typeof EPISODE_ATTACHMENT_TYPE, EpisodeAttachmentData> => ({
      id: 'attach-1',
      type: EPISODE_ATTACHMENT_TYPE,
      data,
      origin: data['episode.id'],
    });

    const formatValue = async (data: EpisodeAttachmentData): Promise<string> => {
      const formatted = await definition.format(buildAttachment(data), {
        request: {} as KibanaRequest,
        spaceId: 'default',
      });
      if (!formatted.getRepresentation) {
        throw new Error('expected format() to return getRepresentation');
      }
      const repr = await formatted.getRepresentation();
      return (repr as { type: 'text'; value: string }).value;
    };

    it('includes episode identity and status', async () => {
      const value = await formatValue(baseEpisodeData);
      expect(value).toContain('ep-1');
      expect(value).toContain('Status: active');
      expect(value).toContain('Rule ID: rule-1');
      expect(value).toContain('Severity: high');
      expect(value).toContain('Tags: ops');
    });

    it('mentions the attachment-scoped refresh and get_rule tools', async () => {
      const value = await formatValue(baseEpisodeData);
      expect(value).toContain(refreshEpisodeToolId('attach-1'));
      expect(value).toContain(getRuleToolId('attach-1'));
      expect(value).toContain('rule-management');
    });

    it('exposes refresh_episode and get_rule bounded tools unique to the attachment', async () => {
      const formatted = await definition.format(buildAttachment(baseEpisodeData), {
        request: {} as KibanaRequest,
        spaceId: 'default',
      });
      expect(formatted.getBoundedTools).toBeDefined();
      const tools = await formatted.getBoundedTools!();
      expect(tools).toHaveLength(2);
      expect(tools[0]).toEqual(
        expect.objectContaining({
          id: refreshEpisodeToolId('attach-1'),
          description: expect.stringContaining('ep-1'),
        })
      );
      expect(tools[1]).toEqual(
        expect.objectContaining({
          id: getRuleToolId('attach-1'),
          description: expect.stringContaining('rule-1'),
        })
      );
      expect(tools[1].description).toContain('rule-management');
    });
  });

  describe('getAgentDescription', () => {
    it('describes read-only episode context, bounded tools, and rule-management skill', () => {
      const description = definition.getAgentDescription!();
      expect(description).toContain('Alerting v2 alert episode');
      expect(description).toContain('read-only');
      expect(description).toContain('refresh_episode');
      expect(description).toContain('get_rule');
      expect(description).toContain('rule-management');
    });
  });

  describe('isReadonly', () => {
    it('is read-only', () => {
      expect(definition.isReadonly).toBe(true);
    });
  });

  describe('getTools', () => {
    it('returns an empty list', () => {
      expect(definition.getTools!()).toEqual([]);
    });
  });
});
