/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import type { ToolHandlerContextMock } from '@kbn/agent-builder-plugin/server/mocks';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { ToolType } from '@kbn/agent-builder-common';
import { ALERTING_TOOL_IDS } from '@kbn/alerting-v2-constants';
import { RULE_ATTACHMENT_TYPE } from '@kbn/alerting-v2-schemas';
import type { RuleAttachmentData } from '@kbn/alerting-v2-schemas';
import { createLoggerService } from '../../../lib/services/logger_service/logger_service.mock';
import { ALERTING_LOG_CODES } from '../../../lib/errors/error_codes';
import type { PrivilegeChecker } from '../../../lib/services/privilege_checker/privilege_checker';
import { attachRuleTool } from './attach_rule';

const rule: RuleAttachmentData = {
  id: 'rule-1',
  enabled: true,
  kind: 'alert',
  metadata: { name: 'High CPU', description: 'CPU breach detection', tags: ['ops'] },
  time_field: '@timestamp',
  schedule: { every: '5m', lookback: '15m' },
  query: { base: 'FROM metrics-* | STATS avg_cpu = AVG(cpu) BY host.name' },
  recovery: { strategy: 'no_breach' },
  no_data: { strategy: 'ignore' },
  created_at: '2026-04-01T00:00:00.000Z',
  updated_at: '2026-04-10T00:00:00.000Z',
};

describe('attachRuleTool', () => {
  let loggerService: ReturnType<typeof createLoggerService>['loggerService'];
  let mockLogger: ReturnType<typeof createLoggerService>['mockLogger'];
  let getRule: jest.Mock;
  let canRead: jest.Mock;
  let ctx: ToolHandlerContextMock;

  const createTool = (canReadResult: boolean = true) => {
    canRead = jest.fn().mockResolvedValue(canReadResult);
    return attachRuleTool({
      logger: loggerService,
      getRulesClient: () => ({ getRule }),
      getPrivilegeChecker: () =>
        ({ canRead, canWrite: jest.fn().mockResolvedValue(true) } as unknown as PrivilegeChecker),
    });
  };

  type HandlerResult = Awaited<ReturnType<ReturnType<typeof createTool>['handler']>>;
  const firstResult = (result: HandlerResult) =>
    'results' in result ? result.results[0] : undefined;

  beforeEach(() => {
    ({ loggerService, mockLogger } = createLoggerService());
    getRule = jest.fn().mockResolvedValue(rule);
    ctx = agentBuilderMocks.tools.createHandlerContext();
    ctx.attachments.getActive.mockReturnValue([]);
    ctx.attachments.add.mockResolvedValue({ id: 'attachment-1' } as never);
  });

  describe('definition', () => {
    it('is a builtin tool that points at manage_rule', () => {
      const tool = createTool();

      expect(tool.id).toBe(ALERTING_TOOL_IDS.attachRule);
      expect(tool.type).toBe(ToolType.builtin);
      expect(tool.description).toContain(ALERTING_TOOL_IDS.manageRule);
    });

    it('requires a bounded rule id', () => {
      const { schema } = createTool();

      expect(schema.safeParse({ ruleId: 'rule-1' }).success).toBe(true);
      expect(schema.safeParse({}).success).toBe(false);
      expect(schema.safeParse({ ruleId: '' }).success).toBe(false);
      expect(schema.safeParse({ ruleId: 'a'.repeat(257) }).success).toBe(false);
    });
  });

  describe('handler', () => {
    it('attaches the saved rule with its id as origin and returns the attachment id', async () => {
      const result = await createTool().handler({ ruleId: 'rule-1' }, ctx);

      expect(getRule).toHaveBeenCalledWith({ id: 'rule-1' });
      expect(ctx.attachments.add).toHaveBeenCalledWith(
        {
          id: expect.any(String),
          type: RULE_ATTACHMENT_TYPE,
          data: rule,
          origin: 'rule-1',
          description: 'Rule: High CPU',
        },
        ATTACHMENT_REF_ACTOR.agent
      );
      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: expect.objectContaining({ success: true, attachment_id: 'attachment-1' }),
          },
        ],
      });
    });

    it('returns the existing attachment instead of adding the rule again', async () => {
      ctx.attachments.getActive.mockReturnValue([
        {
          id: 'existing-1',
          type: RULE_ATTACHMENT_TYPE,
          origin: 'rule-1',
          current_version: 1,
          versions: [{ version: 1, data: rule }],
        },
      ] as never);

      const result = await createTool().handler({ ruleId: 'rule-1' }, ctx);

      expect(getRule).not.toHaveBeenCalled();
      expect(ctx.attachments.add).not.toHaveBeenCalled();
      expect(firstResult(result)).toEqual({
        type: ToolResultType.other,
        data: expect.objectContaining({ success: true, attachment_id: 'existing-1' }),
      });
    });

    it('returns an unauthorized result without reading the rule when the user cannot read rules', async () => {
      const result = await createTool(false).handler({ ruleId: 'rule-1' }, ctx);

      expect(canRead).toHaveBeenCalledWith('rules');
      expect(getRule).not.toHaveBeenCalled();
      expect(ctx.attachments.add).not.toHaveBeenCalled();
      expect(firstResult(result)).toEqual(
        expect.objectContaining({
          type: ToolResultType.error,
          data: expect.objectContaining({
            message: expect.stringContaining('Unauthorized to attach rule'),
          }),
        })
      );
    });

    it('returns a not found error without logging a warning when the rule does not exist', async () => {
      getRule.mockRejectedValueOnce(Boom.notFound('missing'));

      const result = await createTool().handler({ ruleId: 'rule-1' }, ctx);

      expect(firstResult(result)).toEqual({
        type: ToolResultType.error,
        data: { message: 'Rule "rule-1" was not found.' },
      });
      expect(ctx.attachments.add).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('logs and returns an error result on unexpected failures', async () => {
      getRule.mockRejectedValueOnce(new Error('boom'));

      const result = await createTool().handler({ ruleId: 'rule-1' }, ctx);

      expect(firstResult(result)).toEqual({
        type: ToolResultType.error,
        data: { message: 'Failed to attach rule "rule-1": boom' },
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to attach rule',
        expect.objectContaining({
          labels: {
            rule_id: 'rule-1',
            space_id: 'default',
            code: ALERTING_LOG_CODES.AGENT_BUILDER_ATTACH_RULE_FAILED,
          },
          error: expect.objectContaining({ message: 'boom', type: 'Error' }),
        })
      );
    });
  });
});
