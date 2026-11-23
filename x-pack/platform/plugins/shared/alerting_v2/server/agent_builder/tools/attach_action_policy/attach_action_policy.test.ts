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
import { ACTION_POLICY_ATTACHMENT_TYPE } from '@kbn/alerting-v2-schemas';
import { createLoggerService } from '../../../lib/services/logger_service/logger_service.mock';
import { ALERTING_LOG_CODES } from '../../../lib/errors/error_codes';
import type { PrivilegeChecker } from '../../../lib/services/privilege_checker/privilege_checker';
import { attachActionPolicyTool } from './attach_action_policy';

const policy = {
  id: 'policy-1',
  name: 'Page on-call',
  description: 'Pages the on-call team',
  enabled: true,
  destinations: [{ type: 'workflow', id: 'wf-1' }],
  matcher: { tags: ['prod'] },
  created_by: null,
  created_at: '2026-04-01T00:00:00.000Z',
  updated_by: null,
  updated_at: '2026-04-10T00:00:00.000Z',
};

describe('attachActionPolicyTool', () => {
  let loggerService: ReturnType<typeof createLoggerService>['loggerService'];
  let mockLogger: ReturnType<typeof createLoggerService>['mockLogger'];
  let getActionPolicy: jest.Mock;
  let canRead: jest.Mock;
  let ctx: ToolHandlerContextMock;

  const createTool = (canReadResult: boolean = true) => {
    canRead = jest.fn().mockResolvedValue(canReadResult);
    return attachActionPolicyTool({
      logger: loggerService,
      getActionPolicyClient: () => ({ getActionPolicy }),
      getPrivilegeChecker: () =>
        ({ canRead, canWrite: jest.fn().mockResolvedValue(true) } as unknown as PrivilegeChecker),
    });
  };

  type HandlerResult = Awaited<ReturnType<ReturnType<typeof createTool>['handler']>>;
  const firstResult = (result: HandlerResult) =>
    'results' in result ? result.results[0] : undefined;

  beforeEach(() => {
    ({ loggerService, mockLogger } = createLoggerService());
    getActionPolicy = jest.fn().mockResolvedValue(policy);
    ctx = agentBuilderMocks.tools.createHandlerContext();
    ctx.attachments.getActive.mockReturnValue([]);
    ctx.attachments.add.mockResolvedValue({ id: 'attachment-1' } as never);
  });

  describe('definition', () => {
    it('is a builtin tool that points at manage_action_policy', () => {
      const tool = createTool();

      expect(tool.id).toBe(ALERTING_TOOL_IDS.attachActionPolicy);
      expect(tool.type).toBe(ToolType.builtin);
      expect(tool.description).toContain(ALERTING_TOOL_IDS.manageActionPolicy);
    });

    it('requires a bounded policy id', () => {
      const { schema } = createTool();

      expect(schema.safeParse({ policyId: 'policy-1' }).success).toBe(true);
      expect(schema.safeParse({}).success).toBe(false);
      expect(schema.safeParse({ policyId: '' }).success).toBe(false);
      expect(schema.safeParse({ policyId: 'a'.repeat(257) }).success).toBe(false);
    });
  });

  describe('handler', () => {
    it('attaches the saved policy with its id as origin and returns the attachment id', async () => {
      const result = await createTool().handler({ policyId: 'policy-1' }, ctx);

      expect(getActionPolicy).toHaveBeenCalledWith({ id: 'policy-1' });
      expect(ctx.attachments.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ACTION_POLICY_ATTACHMENT_TYPE,
          origin: 'policy-1',
          description: 'Action Policy: Page on-call',
          data: expect.objectContaining({ name: 'Page on-call' }),
        }),
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

    it('returns the existing attachment instead of adding the policy again', async () => {
      ctx.attachments.getActive.mockReturnValue([
        {
          id: 'existing-1',
          type: ACTION_POLICY_ATTACHMENT_TYPE,
          origin: 'policy-1',
          current_version: 1,
          versions: [{ version: 1, data: policy }],
        },
      ] as never);

      const result = await createTool().handler({ policyId: 'policy-1' }, ctx);

      expect(getActionPolicy).not.toHaveBeenCalled();
      expect(ctx.attachments.add).not.toHaveBeenCalled();
      expect(firstResult(result)).toEqual({
        type: ToolResultType.other,
        data: expect.objectContaining({ success: true, attachment_id: 'existing-1' }),
      });
    });

    it('returns an unauthorized result without reading the policy when the user cannot read action policies', async () => {
      const result = await createTool(false).handler({ policyId: 'policy-1' }, ctx);

      expect(canRead).toHaveBeenCalledWith('actionPolicies');
      expect(getActionPolicy).not.toHaveBeenCalled();
      expect(ctx.attachments.add).not.toHaveBeenCalled();
      expect(firstResult(result)).toEqual(
        expect.objectContaining({
          type: ToolResultType.error,
          data: expect.objectContaining({
            message: expect.stringContaining('Unauthorized to attach action policy'),
          }),
        })
      );
    });

    it('returns a not found error without logging a warning when the policy does not exist', async () => {
      getActionPolicy.mockRejectedValueOnce(Boom.notFound('missing'));

      const result = await createTool().handler({ policyId: 'policy-1' }, ctx);

      expect(firstResult(result)).toEqual({
        type: ToolResultType.error,
        data: { message: 'Action policy "policy-1" was not found.' },
      });
      expect(ctx.attachments.add).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('logs and returns an error result on unexpected failures', async () => {
      getActionPolicy.mockRejectedValueOnce(new Error('boom'));

      const result = await createTool().handler({ policyId: 'policy-1' }, ctx);

      expect(firstResult(result)).toEqual({
        type: ToolResultType.error,
        data: { message: 'Failed to attach action policy "policy-1": boom' },
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to attach action policy',
        expect.objectContaining({
          labels: {
            policy_id: 'policy-1',
            space_id: 'default',
            code: ALERTING_LOG_CODES.AGENT_BUILDER_ATTACH_ACTION_POLICY_FAILED,
          },
          error: expect.objectContaining({ message: 'boom', type: 'Error' }),
        })
      );
    });
  });
});
