/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLoggerService } from '../../lib/services/logger_service/logger_service.mock';
import { ALERTING_LOG_CODES } from '../../lib/errors/error_codes';
import Boom from '@hapi/boom';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import type {
  Attachment,
  VersionedAttachmentWithOrigin,
} from '@kbn/agent-builder-common/attachments';
import { RULE_ATTACHMENT_TYPE, type RuleAttachmentData } from '@kbn/alerting-v2-schemas';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { RulesClient } from '../../lib/rules_client';
import { createRuleAttachmentType } from './rule_attachment_type';

const baseRuleData: RuleAttachmentData = {
  id: 'rule-1',
  enabled: true,
  kind: 'alert',
  metadata: {
    name: 'High CPU',
    description: 'CPU breach detection',
    tags: ['ops', 'cpu'],
    owner: 'observability',
  },
  time_field: '@timestamp',
  schedule: { every: '5m', lookback: '15m' },
  query: {
    format: 'standalone',
    breach: { query: 'FROM metrics-* | STATS avg_cpu = AVG(cpu) BY host.name' },
  },
  state_transition: null,
  created_by: 'elastic',
  created_at: '2026-04-01T00:00:00.000Z',
  updated_by: 'elastic',
  updated_at: '2026-04-10T00:00:00.000Z',
};

type RuleVersionedAttachment = VersionedAttachmentWithOrigin<
  typeof RULE_ATTACHMENT_TYPE,
  RuleAttachmentData
>;

const buildVersionedAttachment = (
  overrides: Partial<RuleVersionedAttachment> = {}
): RuleVersionedAttachment => ({
  id: 'attach-1',
  type: RULE_ATTACHMENT_TYPE,
  current_version: 1,
  versions: [
    {
      version: 1,
      data: baseRuleData,
      created_at: '2026-04-10T00:00:00.000Z',
    } as never,
  ],
  origin: 'rule-1',
  origin_snapshot_at: '2026-04-10T00:00:00.000Z',
  ...overrides,
});

const SPACE_ID = 'default';

const createResolveContext = (spaceId: string = SPACE_ID) => ({
  ...agentBuilderMocks.attachments.createResolveContextMock(),
  spaceId,
});

describe('createRuleAttachmentType', () => {
  let loggerService: ReturnType<typeof createLoggerService>['loggerService'];
  let mockLogger: ReturnType<typeof createLoggerService>['mockLogger'];
  let getRule: jest.Mock;
  let definition: AttachmentTypeDefinition<typeof RULE_ATTACHMENT_TYPE, RuleAttachmentData>;

  beforeEach(() => {
    ({ loggerService, mockLogger } = createLoggerService());
    getRule = jest.fn();
    const rulesClient = { getRule } as unknown as RulesClient;
    definition = createRuleAttachmentType({
      logger: loggerService,
      getRulesClient: () => rulesClient,
    });
  });

  describe('id', () => {
    it('uses the shared RULE_ATTACHMENT_TYPE constant', () => {
      expect(definition.id).toBe(RULE_ATTACHMENT_TYPE);
    });
  });

  describe('validate', () => {
    it('returns valid result when input matches schema', async () => {
      const result = await definition.validate(baseRuleData);
      expect(result).toEqual({ valid: true, data: expect.objectContaining({ id: 'rule-1' }) });
    });

    it('returns valid for proposed rule (no id, no audit fields)', async () => {
      const proposed = {
        kind: 'alert',
        metadata: { name: 'New', owner: 'observability' },
        time_field: '@timestamp',
        schedule: { every: '1m' },
        query: { format: 'standalone', breach: { query: 'FROM logs-*' } },
      };
      const result = await definition.validate(proposed);
      expect(result.valid).toBe(true);
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
    it('returns rule data parsed against the schema', async () => {
      getRule.mockResolvedValueOnce(baseRuleData);

      const result = await definition.resolve!('rule-1', createResolveContext());

      expect(getRule).toHaveBeenCalledWith({ id: 'rule-1' });
      expect(result).toEqual(expect.objectContaining({ id: 'rule-1', kind: 'alert' }));
    });

    it('returns undefined without logging when getRule returns 404', async () => {
      getRule.mockRejectedValueOnce(Boom.notFound('not found'));

      const result = await definition.resolve!('rule-missing', createResolveContext());

      expect(result).toBeUndefined();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('returns undefined and logs a warning when getRule throws unexpectedly', async () => {
      getRule.mockRejectedValueOnce(new Error('boom'));

      const result = await definition.resolve!('rule-missing', createResolveContext());

      expect(result).toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to resolve rule attachment',
        expect.objectContaining({
          labels: {
            rule_id: 'rule-missing',
            space_id: SPACE_ID,
            code: ALERTING_LOG_CODES.AGENT_BUILDER_RULE_RESOLVE_FAILED,
          },
          error: expect.objectContaining({
            message: 'boom',
            type: 'Error',
          }),
        })
      );
    });
  });

  describe('isStale', () => {
    it('returns false when origin_snapshot_at is missing', async () => {
      const attachment = buildVersionedAttachment({ origin_snapshot_at: undefined });

      const result = await definition.isStale!(attachment, createResolveContext());

      expect(result).toBe(false);
      expect(getRule).not.toHaveBeenCalled();
    });

    it('returns false when rule.updated_at equals snapshot time', async () => {
      getRule.mockResolvedValueOnce({ ...baseRuleData, updated_at: '2026-04-10T00:00:00.000Z' });

      const result = await definition.isStale!(buildVersionedAttachment(), createResolveContext());

      expect(result).toBe(false);
    });

    it('returns false when rule.updated_at is before snapshot time', async () => {
      getRule.mockResolvedValueOnce({ ...baseRuleData, updated_at: '2026-04-09T00:00:00.000Z' });

      const result = await definition.isStale!(buildVersionedAttachment(), createResolveContext());

      expect(result).toBe(false);
    });

    it('returns true when rule.updated_at is after snapshot AND differs from latest version', async () => {
      getRule.mockResolvedValueOnce({ ...baseRuleData, updated_at: '2026-04-20T00:00:00.000Z' });

      const result = await definition.isStale!(buildVersionedAttachment(), createResolveContext());

      expect(result).toBe(true);
    });

    it('returns false when rule.updated_at is after snapshot but matches latest version', async () => {
      const sameUpdatedAt = '2026-04-15T00:00:00.000Z';
      getRule.mockResolvedValueOnce({ ...baseRuleData, updated_at: sameUpdatedAt });
      const attachment = buildVersionedAttachment({
        versions: [
          {
            version: 1,
            data: { ...baseRuleData, updated_at: sameUpdatedAt },
            created_at: '2026-04-15T00:00:00.000Z',
          } as never,
        ],
      });

      const result = await definition.isStale!(attachment, createResolveContext());

      expect(result).toBe(false);
    });

    it('returns false without logging when getRule returns 404', async () => {
      getRule.mockRejectedValueOnce(Boom.notFound('not found'));

      const result = await definition.isStale!(buildVersionedAttachment(), createResolveContext());

      expect(result).toBe(false);
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('returns false and logs a warning when getRule throws', async () => {
      getRule.mockRejectedValueOnce(new Error('boom'));

      const result = await definition.isStale!(buildVersionedAttachment(), createResolveContext());

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to check rule attachment staleness',
        expect.objectContaining({
          labels: {
            rule_id: 'rule-1',
            space_id: SPACE_ID,
            code: ALERTING_LOG_CODES.AGENT_BUILDER_RULE_STALENESS_CHECK_FAILED,
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
      data: RuleAttachmentData,
      origin?: string
    ): Attachment<typeof RULE_ATTACHMENT_TYPE, RuleAttachmentData> => ({
      id: 'attach-1',
      type: RULE_ATTACHMENT_TYPE,
      data,
      ...(origin ? { origin } : {}),
    });

    const formatValue = async (data: RuleAttachmentData, origin?: string): Promise<string> => {
      const formatted = await definition.format(buildAttachment(data, origin), {
        request: {} as KibanaRequest,
        spaceId: 'default',
      });
      if (!formatted.getRepresentation) {
        throw new Error('expected format() to return getRepresentation');
      }
      const repr = await formatted.getRepresentation();
      return (repr as { type: 'text'; value: string }).value;
    };

    it('reports enabled saved rule', async () => {
      const value = await formatValue(baseRuleData, 'rule-1');
      expect(value).toContain('Status: enabled');
      expect(value).toContain('"High CPU"');
      expect(value).toContain('Schedule: every 5m');
      expect(value).toContain('Tags: ops, cpu');
      expect(value).toContain('Description: CPU breach detection');
      expect(value).toContain('Kind: alert');
    });

    it('reports disabled saved rule', async () => {
      const value = await formatValue({ ...baseRuleData, enabled: false }, 'rule-1');
      expect(value).toContain('Status: disabled');
    });

    it('includes Rule ID when origin is set', async () => {
      const value = await formatValue(baseRuleData, 'rule-1');
      expect(value).toContain('Rule ID: rule-1');
    });

    it('omits Rule ID when origin is not set', async () => {
      const value = await formatValue(baseRuleData);
      expect(value).not.toContain('Rule ID:');
    });

    it('reports proposed rule when origin is not set', async () => {
      const value = await formatValue(baseRuleData);
      expect(value).toContain('Status: proposed (not yet saved)');
    });

    it('omits description and tags lines when absent', async () => {
      const value = await formatValue({
        ...baseRuleData,
        metadata: { name: 'Bare', owner: 'observability' },
      });
      expect(value).not.toContain('Description:');
      expect(value).not.toContain('Tags:');
      expect(value).toContain('"Bare"');
    });

    it('shows unknown schedule when schedule.every is missing', async () => {
      const value = await formatValue({ ...baseRuleData, schedule: { every: '' } as never });
      expect(value).toContain('Schedule: unknown');
    });
  });

  describe('getAgentDescription', () => {
    it('mentions rule attachment, persistence states, and the rule-management skill', () => {
      const description = definition.getAgentDescription!();
      expect(description).toContain('Alerting v2 rule');
      expect(description).toContain('proposed');
      expect(description).toContain('saved rule');
      expect(description).toContain('rule-management');
    });

    it('does not mention non-existent tools or skills', () => {
      const description = definition.getAgentDescription!();
      expect(description).not.toContain('rule-authoring');
      expect(description).not.toContain('enable_rule');
      expect(description).not.toContain('disable_rule');
    });
  });

  describe('getTools', () => {
    it('returns an empty list (no inline tools exposed via the attachment)', () => {
      expect(definition.getTools!()).toEqual([]);
    });
  });
});
