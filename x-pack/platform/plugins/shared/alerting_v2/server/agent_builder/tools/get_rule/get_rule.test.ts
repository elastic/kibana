/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLoggerService } from '../../../lib/services/logger_service/logger_service.mock';
import { ALERTING_LOG_CODES } from '../../../lib/errors/error_codes';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import Boom from '@hapi/boom';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { ToolType } from '@kbn/agent-builder-common';
import type { RuleAttachmentData } from '@kbn/alerting-v2-schemas';
import type { RulesClient } from '../../../lib/rules_client';
import type { PrivilegeChecker } from '../../../lib/services/privilege_checker/privilege_checker';
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
  created_by: 'elastic',
  created_at: '2026-04-01T00:00:00.000Z',
  updated_by: 'elastic',
  updated_at: '2026-04-10T00:00:00.000Z',
};

describe('getRuleTool', () => {
  let loggerService: ReturnType<typeof createLoggerService>['loggerService'];
  let mockLogger: ReturnType<typeof createLoggerService>['mockLogger'];
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
    getRule = jest.fn();
  });

  const createTool = (canReadResult: boolean = true) =>
    getRuleTool({
      attachmentId: 'attach-1',
      alertId: 'ep-1',
      ruleId: 'rule-1',
      logger: loggerService,
      getRulesClient: () => ({ getRule } as unknown as RulesClient),
      getPrivilegeChecker: () => createPrivilegeCheckerMock(canReadResult),
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

      const result = await createTool().handler({}, agentBuilderMocks.tools.createHandlerContext());

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

    it('returns an error without logging when getRule returns 404', async () => {
      getRule.mockRejectedValueOnce(Boom.notFound('Rule not found'));

      const result = await createTool().handler({}, agentBuilderMocks.tools.createHandlerContext());

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: 'Failed to fetch rule "rule-1" for episode "ep-1": Rule not found',
            },
          },
        ],
      });
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('returns an error and logs a warning when getRule throws unexpectedly', async () => {
      getRule.mockRejectedValueOnce(new Error('boom'));

      const result = await createTool().handler({}, agentBuilderMocks.tools.createHandlerContext());

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: 'Failed to fetch rule "rule-1" for episode "ep-1": boom',
            },
          },
        ],
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to fetch rule for episode',
        expect.objectContaining({
          labels: {
            rule_id: 'rule-1',
            episode_id: 'ep-1',
            space_id: 'default',
            code: ALERTING_LOG_CODES.AGENT_BUILDER_EPISODE_GET_RULE_FAILED,
          },
          error: expect.objectContaining({
            message: 'boom',
            type: 'Error',
          }),
        })
      );
    });

    it('returns an unauthorized error when user lacks Rules: Read', async () => {
      const result = await createTool(false).handler(
        {},
        agentBuilderMocks.tools.createHandlerContext()
      );

      expect(getRule).not.toHaveBeenCalled();
      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: expect.stringContaining('Missing Kibana privilege: Rules: Read'),
              metadata: { missingPrivileges: ['Rules: Read'] },
            },
          },
        ],
      });
    });

    it('checks Rules: Read before fetching', async () => {
      getRule.mockResolvedValueOnce(baseRuleData);

      await createTool().handler({}, agentBuilderMocks.tools.createHandlerContext());

      expect(canRead).toHaveBeenCalledWith('rules');
    });
  });
});
