/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLoggerService } from '../../lib/services/logger_service/logger_service.mock';
import { ALERTING_LOG_CODES } from '../../lib/errors/error_codes';
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
import type { PrivilegeChecker } from '../../lib/services/privilege_checker/privilege_checker';
import { getRuleToolId } from '../tools/get_rule';
import { refreshEpisodeToolId } from '../tools/refresh_episode';
import {
  createEpisodeAttachmentType,
  EPISODE_ATTACHMENT_STALE_AFTER_MS,
} from './episode_attachment_type';

const SPACE_ID = 'default';

const createResolveContext = (spaceId: string = SPACE_ID) => ({
  ...agentBuilderMocks.attachments.createResolveContextMock(),
  spaceId,
});

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
  let loggerService: ReturnType<typeof createLoggerService>['loggerService'];
  let mockLogger: ReturnType<typeof createLoggerService>['mockLogger'];
  let getEpisode: jest.Mock;
  let getRule: jest.Mock;
  let canRead: jest.Mock;
  let definition: AttachmentTypeDefinition<typeof EPISODE_ATTACHMENT_TYPE, EpisodeAttachmentData>;

  const createPrivilegeCheckerMock = (canReadResult: boolean = true) => {
    canRead = jest.fn().mockResolvedValue(canReadResult);
    return {
      canRead,
      canWrite: jest.fn().mockResolvedValue(true),
    } as unknown as PrivilegeChecker;
  };

  beforeEach(() => {
    ({ loggerService, mockLogger } = createLoggerService());
    getEpisode = jest.fn();
    getRule = jest.fn();
    const episodesClient = { get: getEpisode } as unknown as EpisodesClient;
    const rulesClient = { getRule } as unknown as RulesClient;
    definition = createEpisodeAttachmentType({
      logger: loggerService,
      getEpisodesClient: () => episodesClient,
      getRulesClient: () => rulesClient,
      getPrivilegeChecker: () => createPrivilegeCheckerMock(true),
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
      getEpisode.mockResolvedValueOnce(baseEpisodeData);

      const result = await definition.resolve!('ep-1', createResolveContext());

      expect(getEpisode).toHaveBeenCalledWith('ep-1');
      expect(result).toEqual(expect.objectContaining({ 'episode.id': 'ep-1' }));
    });

    it('includes the episode name when the rule can be loaded', async () => {
      getEpisode.mockResolvedValueOnce(baseEpisodeData);
      getRule.mockResolvedValueOnce({ metadata: { name: 'Host CPU high' } });

      const result = await definition.resolve!('ep-1', createResolveContext());

      expect(getRule).toHaveBeenCalledWith({ id: 'rule-1' });
      expect(result).toEqual(expect.objectContaining({ 'episode.name': 'Host CPU high alert' }));
    });

    it('includes the rule name and group when both are available', async () => {
      getEpisode.mockResolvedValueOnce({
        ...baseEpisodeData,
        episode_data: JSON.stringify({ host: { name: 'web-01' } }),
      });
      getRule.mockResolvedValueOnce({
        metadata: { name: 'Host CPU high' },
        grouping: { fields: ['host.name'] },
      });

      const result = await definition.resolve!('ep-1', createResolveContext());

      expect(result).toEqual(
        expect.objectContaining({ 'episode.name': 'Host CPU high alert for web-01' })
      );
    });

    it('omits the episode name when the rule cannot be loaded and there is no group name', async () => {
      getEpisode.mockResolvedValueOnce(baseEpisodeData);
      getRule.mockRejectedValueOnce(new Error('not found'));

      const result = await definition.resolve!('ep-1', createResolveContext());

      expect(result).toEqual(expect.not.objectContaining({ 'episode.name': expect.anything() }));
    });

    it('omits the episode name when the rule cannot be loaded and grouping fields are unknown', async () => {
      getEpisode.mockResolvedValueOnce({
        ...baseEpisodeData,
        episode_data: JSON.stringify({ host: { name: 'web-01' } }),
      });
      getRule.mockRejectedValueOnce(new Error('not found'));

      const result = await definition.resolve!('ep-1', createResolveContext());

      expect(result).toEqual(expect.not.objectContaining({ 'episode.name': expect.anything() }));
    });

    it('uses grouping fields from the rule when the rule name is missing', async () => {
      getEpisode.mockResolvedValueOnce({
        ...baseEpisodeData,
        episode_data: JSON.stringify({ host: { name: 'web-01' }, cpu: 95 }),
      });
      getRule.mockResolvedValueOnce({
        metadata: { name: '' },
        grouping: { fields: ['host.name'] },
      });

      const result = await definition.resolve!('ep-1', createResolveContext());

      expect(result).toEqual(expect.objectContaining({ 'episode.name': 'web-01 alert' }));
    });

    it('normalizes null optional fields via alertEpisodeToEpisodeAttachment', async () => {
      const episodeWithNulls = {
        ...baseEpisodeData,
        triggered_at: null,
        last_ack_action: null,
        last_assignee_uid: null,
        last_snooze_action: null,
        snooze_expiry: null,
        last_tags: null,
        episode_data: null,
        severity: null,
      } as AlertEpisode;
      getEpisode.mockResolvedValueOnce(episodeWithNulls);

      const result = await definition.resolve!('ep-1', createResolveContext());

      expect(result).toEqual(
        expect.objectContaining({
          'episode.id': 'ep-1',
          last_ack_action: undefined,
          last_assignee_uid: undefined,
          last_snooze_action: undefined,
          snooze_expiry: undefined,
          last_tags: undefined,
          episode_data: undefined,
          severity: undefined,
        })
      );
    });

    it('returns undefined when the episode does not exist', async () => {
      getEpisode.mockResolvedValueOnce(undefined);

      const result = await definition.resolve!('ep-missing', createResolveContext());

      expect(result).toBeUndefined();
    });

    it('returns undefined and logs a warning when the client throws', async () => {
      getEpisode.mockRejectedValueOnce(new Error('boom'));

      const result = await definition.resolve!('ep-missing', createResolveContext());

      expect(result).toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to resolve episode attachment',
        expect.objectContaining({
          labels: {
            episode_id: 'ep-missing',
            space_id: SPACE_ID,
            code: ALERTING_LOG_CODES.AGENT_BUILDER_EPISODE_RESOLVE_FAILED,
          },
          error: expect.objectContaining({
            message: 'boom',
            type: 'Error',
          }),
        })
      );
    });

    it('returns undefined without fetching when user lacks Alerts: Read', async () => {
      const unauthorizedDefinition = createEpisodeAttachmentType({
        logger: loggerService,
        getEpisodesClient: () => ({ get: getEpisode } as unknown as EpisodesClient),
        getRulesClient: () => ({ getRule } as unknown as RulesClient),
        getPrivilegeChecker: () => createPrivilegeCheckerMock(false),
      });

      const result = await unauthorizedDefinition.resolve!('ep-1', createResolveContext());

      expect(result).toBeUndefined();
      expect(getEpisode).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Unauthorized to resolve episode attachment', {
        labels: { episode_id: 'ep-1', space_id: SPACE_ID },
      });
    });

    it('resolves episode data when user has Alerts: Read', async () => {
      getEpisode.mockResolvedValueOnce(baseEpisodeData);

      const result = await definition.resolve!('ep-1', createResolveContext());

      expect(result).toEqual(expect.objectContaining({ 'episode.id': 'ep-1' }));
      expect(getEpisode).toHaveBeenCalledWith('ep-1');
      expect(canRead).toHaveBeenCalledWith('alerts');
    });
  });

  describe('isStale', () => {
    const NOW = '2026-08-14T17:22:00.000Z';

    const attachmentAt = (createdAt: string, data: EpisodeAttachmentData = baseEpisodeData) =>
      buildVersionedAttachment({
        origin_snapshot_at: createdAt,
        versions: [
          {
            version: 1,
            data,
            created_at: createdAt,
          } as never,
        ],
      });

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(NOW));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns false when origin is missing', async () => {
      const attachment = buildVersionedAttachment({ origin: undefined });

      const result = await definition.isStale!(attachment, createResolveContext());

      expect(result).toBe(false);
      expect(getEpisode).not.toHaveBeenCalled();
    });

    it('returns false when the episode does not exist', async () => {
      getEpisode.mockResolvedValueOnce(undefined);

      const result = await definition.isStale!(buildVersionedAttachment(), createResolveContext());

      expect(result).toBe(false);
    });

    it('returns false without fetching when the snapshot is already inactive', async () => {
      const inactive = { ...baseEpisodeData, 'episode.status': ALERT_EPISODE_STATUS.INACTIVE };

      const result = await definition.isStale!(
        attachmentAt('2026-04-10T12:00:00.000Z', inactive),
        createResolveContext()
      );

      expect(result).toBe(false);
      expect(getEpisode).not.toHaveBeenCalled();
    });

    it('returns true when live status is inactive but the snapshot is not', async () => {
      getEpisode.mockResolvedValueOnce({
        ...baseEpisodeData,
        'episode.status': ALERT_EPISODE_STATUS.INACTIVE,
      });

      const result = await definition.isStale!(
        attachmentAt('2026-04-10T12:00:00.000Z'),
        createResolveContext()
      );

      expect(result).toBe(true);
    });

    it('returns false when a non-inactive snapshot is within 5 minutes', async () => {
      getEpisode.mockResolvedValueOnce(baseEpisodeData);

      const result = await definition.isStale!(
        attachmentAt(new Date(Date.parse(NOW) - EPISODE_ATTACHMENT_STALE_AFTER_MS).toISOString()),
        createResolveContext()
      );

      expect(result).toBe(false);
    });

    it('returns true when a non-inactive snapshot is older than 5 minutes', async () => {
      getEpisode.mockResolvedValueOnce({
        ...baseEpisodeData,
        'episode.status': ALERT_EPISODE_STATUS.RECOVERING,
      });

      const result = await definition.isStale!(
        attachmentAt(
          new Date(Date.parse(NOW) - EPISODE_ATTACHMENT_STALE_AFTER_MS - 1).toISOString()
        ),
        createResolveContext()
      );

      expect(result).toBe(true);
    });

    it('returns true when current_version has no matching version entry', async () => {
      getEpisode.mockResolvedValueOnce(baseEpisodeData);
      const attachment = buildVersionedAttachment({
        current_version: 99,
      });

      const result = await definition.isStale!(attachment, createResolveContext());

      expect(result).toBe(true);
    });

    it('returns false after a refresh resets snapshot age', async () => {
      getEpisode.mockResolvedValueOnce(baseEpisodeData);
      const attachment = buildVersionedAttachment({
        current_version: 2,
        versions: [
          {
            version: 1,
            data: baseEpisodeData,
            created_at: '2026-04-10T12:00:00.000Z',
          } as never,
          {
            version: 2,
            data: baseEpisodeData,
            created_at: NOW,
          } as never,
        ],
      });

      const result = await definition.isStale!(attachment, createResolveContext());

      expect(result).toBe(false);
    });

    it('returns false and logs a warning when the client throws', async () => {
      getEpisode.mockRejectedValueOnce(new Error('boom'));

      const result = await definition.isStale!(buildVersionedAttachment(), createResolveContext());

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to check episode attachment staleness',
        expect.objectContaining({
          labels: {
            episode_id: 'ep-1',
            space_id: SPACE_ID,
            code: ALERTING_LOG_CODES.AGENT_BUILDER_EPISODE_STALENESS_CHECK_FAILED,
          },
          error: expect.objectContaining({
            message: 'boom',
            type: 'Error',
          }),
        })
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

    it('identifies the episode as a platform alert, not Security', async () => {
      const value = await formatValue(baseEpisodeData);
      expect(value).toContain('platform alert');
      expect(value).not.toContain('v2');
      expect(value).toContain('not a Security/SIEM detection alert');
      expect(value).toContain('alert-analysis');
      expect(value).toContain('.alerts-security.alerts-*');
    });

    it('includes the episode name when present', async () => {
      const value = await formatValue({
        ...baseEpisodeData,
        'episode.name': 'Host CPU high alert',
      });
      expect(value).toContain('Episode name: Host CPU high alert');
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
      expect(description).toContain('platform alert');
      expect(description).not.toContain('v2');
      expect(description).toContain('not a Security/SIEM detection alert');
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
