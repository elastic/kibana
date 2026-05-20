/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type {
  AttachmentResolveContext,
  AttachmentTypeDefinition,
} from '@kbn/agent-builder-server/attachments';
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
  evaluation: { query: { base: 'FROM metrics-* | STATS avg_cpu = AVG(cpu) BY host.name' } },
  state_transition: null,
  createdBy: 'elastic',
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedBy: 'elastic',
  updatedAt: '2026-04-10T00:00:00.000Z',
};

const buildResolveContext = (): AttachmentResolveContext =>
  ({ request: {} as KibanaRequest, spaceId: 'default' } as AttachmentResolveContext);

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

describe('createRuleAttachmentType', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let getRule: jest.Mock;
  let definition: AttachmentTypeDefinition<typeof RULE_ATTACHMENT_TYPE, RuleAttachmentData>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    getRule = jest.fn();
    const rulesClient = { getRule } as unknown as RulesClient;
    definition = createRuleAttachmentType({
      logger,
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
        evaluation: { query: { base: 'FROM logs-*' } },
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

      const result = await definition.resolve!('rule-1', buildResolveContext());

      expect(getRule).toHaveBeenCalledWith({ id: 'rule-1' });
      expect(result).toEqual(expect.objectContaining({ id: 'rule-1', kind: 'alert' }));
    });

    it('returns undefined and logs a warning when getRule throws', async () => {
      getRule.mockRejectedValueOnce(new Error('not found'));

      const result = await definition.resolve!('rule-missing', buildResolveContext());

      expect(result).toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to resolve rule attachment for origin "rule-missing"')
      );
    });
  });

  describe('isStale', () => {
    it('returns false when origin_snapshot_at is missing', async () => {
      const attachment = buildVersionedAttachment({ origin_snapshot_at: undefined });

      const result = await definition.isStale!(attachment, buildResolveContext());

      expect(result).toBe(false);
      expect(getRule).not.toHaveBeenCalled();
    });

    it('returns false when rule.updatedAt equals snapshot time', async () => {
      getRule.mockResolvedValueOnce({ ...baseRuleData, updatedAt: '2026-04-10T00:00:00.000Z' });

      const result = await definition.isStale!(buildVersionedAttachment(), buildResolveContext());

      expect(result).toBe(false);
    });

    it('returns false when rule.updatedAt is before snapshot time', async () => {
      getRule.mockResolvedValueOnce({ ...baseRuleData, updatedAt: '2026-04-09T00:00:00.000Z' });

      const result = await definition.isStale!(buildVersionedAttachment(), buildResolveContext());

      expect(result).toBe(false);
    });

    it('returns true when rule.updatedAt is after snapshot AND differs from latest version', async () => {
      getRule.mockResolvedValueOnce({ ...baseRuleData, updatedAt: '2026-04-20T00:00:00.000Z' });

      const result = await definition.isStale!(buildVersionedAttachment(), buildResolveContext());

      expect(result).toBe(true);
    });

    it('returns false when rule.updatedAt is after snapshot but matches latest version', async () => {
      const sameUpdatedAt = '2026-04-15T00:00:00.000Z';
      getRule.mockResolvedValueOnce({ ...baseRuleData, updatedAt: sameUpdatedAt });
      const attachment = buildVersionedAttachment({
        versions: [
          {
            version: 1,
            data: { ...baseRuleData, updatedAt: sameUpdatedAt },
            created_at: '2026-04-15T00:00:00.000Z',
          } as never,
        ],
      });

      const result = await definition.isStale!(attachment, buildResolveContext());

      expect(result).toBe(false);
    });

    it('returns false and logs a warning when getRule throws', async () => {
      getRule.mockRejectedValueOnce(new Error('boom'));

      const result = await definition.isStale!(buildVersionedAttachment(), buildResolveContext());

      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to check staleness for rule attachment "rule-1"')
      );
    });
  });

  describe('format', () => {
    const buildAttachment = (
      data: RuleAttachmentData
    ): Attachment<typeof RULE_ATTACHMENT_TYPE, RuleAttachmentData> => ({
      id: 'attach-1',
      type: RULE_ATTACHMENT_TYPE,
      data,
    });

    const formatValue = async (data: RuleAttachmentData): Promise<string> => {
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

    it('reports enabled saved rule', async () => {
      const value = await formatValue(baseRuleData);
      expect(value).toContain('Status: enabled');
      expect(value).toContain('"High CPU"');
      expect(value).toContain('Schedule: every 5m');
      expect(value).toContain('Tags: ops, cpu');
      expect(value).toContain('Description: CPU breach detection');
      expect(value).toContain('Kind: alert');
    });

    it('reports disabled saved rule', async () => {
      const value = await formatValue({ ...baseRuleData, enabled: false });
      expect(value).toContain('Status: disabled');
    });

    it('reports proposed rule when id is missing', async () => {
      const proposed: RuleAttachmentData = {
        ...baseRuleData,
        id: undefined,
        enabled: undefined,
        createdBy: undefined,
        createdAt: undefined,
        updatedBy: undefined,
        updatedAt: undefined,
      };
      const value = await formatValue(proposed);
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
