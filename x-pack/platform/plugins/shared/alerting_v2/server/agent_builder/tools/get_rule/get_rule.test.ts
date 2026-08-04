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
import type { RuleAttachmentData } from '@kbn/alerting-v2-schemas';
import type { RulesClient } from '../../../lib/rules_client';
import { getRuleTool, getRuleToolId } from './get_rule';

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
  createdBy: 'elastic',
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedBy: 'elastic',
  updatedAt: '2026-04-10T00:00:00.000Z',
};

describe('getRuleTool', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let getRule: jest.Mock;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    getRule = jest.fn();
  });

  const createTool = () =>
    getRuleTool({
      attachmentId: 'attach-1',
      episodeId: 'ep-1',
      ruleId: 'rule-1',
      logger,
      getRulesClient: () => ({ getRule } as unknown as RulesClient),
    });

  describe('id', () => {
    it('is unique per attachment instance', () => {
      expect(getRuleToolId('attach-1')).toBe('platform.alerting.get_rule.attach-1');
      expect(createTool().id).toBe(getRuleToolId('attach-1'));
    });
  });

  describe('definition', () => {
    it('is a builtin read-only tool that points at rule-management', () => {
      const tool = createTool();
      expect(tool.type).toBe(ToolType.builtin);
      expect(tool.description).toContain('rule-1');
      expect(tool.description).toContain('ep-1');
      expect(tool.description).toContain('attach-1');
      expect(tool.description).toContain('read-only');
      expect(tool.description).toContain('rule-management');
      expect(tool.schema.safeParse({}).success).toBe(true);
    });
  });

  describe('handler', () => {
    it('returns the associated rule', async () => {
      getRule.mockResolvedValueOnce(baseRuleData);

      const result = await createTool().handler(
        {},
        agentBuilderMocks.tools.createHandlerContext()
      );

      expect(getRule).toHaveBeenCalledWith({ id: 'rule-1' });
      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: expect.objectContaining({
              id: 'rule-1',
              metadata: expect.objectContaining({ name: 'High CPU' }),
            }),
          },
        ],
      });
    });

    it('returns an error when getRule throws', async () => {
      getRule.mockRejectedValueOnce(new Error('not found'));

      const result = await createTool().handler(
        {},
        agentBuilderMocks.tools.createHandlerContext()
      );

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: 'Failed to fetch rule "rule-1" for episode "ep-1": not found',
            },
          },
        ],
      });
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch rule "rule-1" for episode "ep-1"')
      );
    });
  });
});
