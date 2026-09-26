/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('uuid', () => ({
  v4: () => '00000000-0000-4000-8000-000000000001',
}));

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import type { ToolHandlerContextMock } from '@kbn/agent-builder-plugin/server/mocks';
import { ALERTING_LOG_CODES } from '../../../lib/errors/error_codes';
import type { LoggerServiceContract } from '../../../lib/services/logger_service/logger_service';
import { manageActionPolicyTool, type ManageActionPolicyToolDeps } from './manage_action_policy';

const createLogger = (): jest.Mocked<
  Pick<LoggerServiceContract, 'debug' | 'info' | 'warn' | 'error' | 'forSubsystem'>
> => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  forSubsystem: jest.fn(),
});

const createDeps = (
  logger: LoggerServiceContract = createLogger() as unknown as LoggerServiceContract
): ManageActionPolicyToolDeps => ({
  logger,
  getWorkflow: jest.fn().mockResolvedValue({ id: 'wf-1', name: 'My Workflow' }),
  getAvailableConnectors: jest.fn().mockResolvedValue({ connectorTypes: {} }),
});

const createContext = (): ToolHandlerContextMock => {
  const ctx = agentBuilderMocks.tools.createHandlerContext();
  ctx.attachments.add.mockResolvedValue({
    id: 'mock-attachment-id',
    current_version: 1,
  } as never);
  ctx.attachments.update.mockResolvedValue({
    id: 'mock-attachment-id',
    current_version: 2,
  } as never);
  (ctx.attachments as any).getActive = jest.fn().mockReturnValue([]);
  return ctx;
};

describe('manageActionPolicyTool', () => {
  describe('handler', () => {
    it('creates a new action policy attachment with valid operations', async () => {
      const deps = createDeps();
      const tool = manageActionPolicyTool(deps);
      const ctx = createContext();

      const result = await tool.handler(
        {
          operations: [
            { operation: 'set_metadata', name: 'My Policy', description: 'A test policy' },
            {
              operation: 'set_destinations',
              destinations: [{ type: 'workflow', id: 'wf-1' }],
            },
          ],
        },
        ctx
      );

      expect(ctx.attachments.add).toHaveBeenCalledTimes(1);
      expect(ctx.attachments.update).not.toHaveBeenCalled();
      const { results } = result as {
        results: Array<{ type: string; data?: { actionPolicyAttachment?: { policyId?: string } } }>;
      };
      expect(results[0].type).toBe(ToolResultType.other);
      expect(results[0].data?.actionPolicyAttachment?.policyId).toBeDefined();
    });

    it('pre-assigns a stable policy ID on new attachments', async () => {
      const deps = createDeps();
      const tool = manageActionPolicyTool(deps);
      const ctx = createContext();

      const result = await tool.handler(
        {
          operations: [
            { operation: 'set_metadata', name: 'ID Test' },
            {
              operation: 'set_destinations',
              destinations: [{ type: 'workflow', id: 'wf-1' }],
            },
          ],
        },
        ctx
      );

      const { results } = result as {
        results: Array<{ type: string; data?: { actionPolicyAttachment?: { policyId?: string } } }>;
      };
      const addCall = ctx.attachments.add.mock.calls[0][0] as { data: { id?: string } };
      expect(addCall.data.id).toBeDefined();
      expect(addCall.data.id).toBe(results[0].data?.actionPolicyAttachment?.policyId);
    });

    it('updates an existing attachment when actionPolicyAttachmentId is provided', async () => {
      const deps = createDeps();
      const tool = manageActionPolicyTool(deps);
      const ctx = createContext();
      ctx.attachments.getAttachmentRecord.mockReturnValue({
        versions: [
          {
            data: {
              id: 'policy-uuid',
              name: 'Existing Policy',
              destinations: [{ type: 'workflow', id: 'wf-1' }],
            },
          },
        ],
      } as never);

      const result = await tool.handler(
        {
          actionPolicyAttachmentId: 'existing-id',
          operations: [{ operation: 'set_metadata', name: 'Updated Policy' }],
        },
        ctx
      );

      expect(ctx.attachments.update).toHaveBeenCalledTimes(1);
      expect(ctx.attachments.add).not.toHaveBeenCalled();
      const { results } = result as { results: Array<{ type: string }> };
      expect(results[0].type).toBe(ToolResultType.other);
    });

    it('returns an error when creating a policy without a name', async () => {
      const deps = createDeps();
      const tool = manageActionPolicyTool(deps);
      const ctx = createContext();

      const result = await tool.handler(
        {
          operations: [
            {
              operation: 'set_destinations',
              destinations: [{ type: 'workflow', id: 'wf-1' }],
            },
          ],
        },
        ctx
      );

      const { results } = result as { results: Array<{ type: string; data: { message: string } }> };
      expect(results[0].type).toBe(ToolResultType.error);
      expect(results[0].data.message).toContain('name is required');
    });

    it('returns an error when attachment persistence fails', async () => {
      const deps = createDeps();
      const tool = manageActionPolicyTool(deps);
      const ctx = createContext();
      ctx.attachments.add.mockResolvedValue(undefined as never);

      const result = await tool.handler(
        {
          operations: [
            { operation: 'set_metadata', name: 'Failing Policy' },
            {
              operation: 'set_destinations',
              destinations: [{ type: 'workflow', id: 'wf-1' }],
            },
          ],
        },
        ctx
      );

      const { results } = result as { results: Array<{ type: string; data: { message: string } }> };
      expect(results[0].type).toBe(ToolResultType.error);
      expect(results[0].data.message).toContain('Failed to persist action policy attachment');
    });

    it('calls validateDestinations for destinations', async () => {
      const deps = createDeps();
      const tool = manageActionPolicyTool(deps);
      const ctx = createContext();

      await tool.handler(
        {
          operations: [
            { operation: 'set_metadata', name: 'Resolved Test' },
            {
              operation: 'set_destinations',
              destinations: [{ type: 'workflow', id: 'wf-1' }],
            },
          ],
        },
        ctx
      );

      expect(ctx.attachments.add).toHaveBeenCalled();
    });

    it('returns an error when the destination workflow has no manual trigger', async () => {
      const deps = createDeps();
      deps.getWorkflow = jest.fn().mockResolvedValue({
        id: 'wf-1',
        name: 'Alert-only workflow',
        yaml: 'name: notify\ntriggers:\n  - type: alert\n',
      });
      const tool = manageActionPolicyTool(deps);
      const ctx = createContext();

      const result = await tool.handler(
        {
          operations: [
            { operation: 'set_metadata', name: 'Invalid Workflow Policy' },
            {
              operation: 'set_destinations',
              destinations: [{ type: 'workflow', id: 'wf-1' }],
            },
          ],
        },
        ctx
      );

      const { results } = result as { results: Array<{ type: string; data: { message: string } }> };
      expect(results[0].type).toBe(ToolResultType.error);
      expect(results[0].data.message).toContain('does not have a "manual" trigger');
      expect(ctx.attachments.add).not.toHaveBeenCalled();
    });

    it('surfaces a workflowDiagnostics warning when inputs.payload has no $ref, without failing the call', async () => {
      const deps = createDeps();
      deps.getWorkflow = jest.fn().mockResolvedValue({
        id: 'wf-1',
        name: 'Missing payload ref',
        yaml: 'name: notify\ntriggers:\n  - type: manual\n',
      });
      const tool = manageActionPolicyTool(deps);
      const ctx = createContext();

      const result = await tool.handler(
        {
          operations: [
            { operation: 'set_metadata', name: 'Warning Policy' },
            {
              operation: 'set_destinations',
              destinations: [{ type: 'workflow', id: 'wf-1' }],
            },
          ],
        },
        ctx
      );

      const { results } = result as {
        results: Array<{
          type: string;
          data?: {
            workflowDiagnostics?: Array<{ destinationId: string; source: string; message: string }>;
          };
        }>;
      };
      expect(results[0].type).toBe(ToolResultType.other);
      expect(results[0].data?.workflowDiagnostics).toEqual([
        expect.objectContaining({ destinationId: 'wf-1', source: 'structural' }),
      ]);
      expect(ctx.attachments.add).toHaveBeenCalled();
    });

    it('surfaces variable-ref errors from validateWorkflow as workflowDiagnostics warnings', async () => {
      const deps = createDeps();
      deps.getWorkflow = jest.fn().mockResolvedValue({
        id: 'wf-1',
        name: 'Typo in payload ref',
        yaml: [
          'name: notify',
          'triggers:',
          '  - type: manual',
          '    inputs:',
          '      properties:',
          '        payload:',
          "          $ref: '#/kibana/definitions/alertingV2NotificationGroup'",
        ].join('\n'),
      });
      deps.validateWorkflow = jest.fn().mockResolvedValue({
        valid: false,
        diagnostics: [
          {
            severity: 'error',
            ruleId: 'invalidVariablePath',
            message: 'Unknown path "episodez" on `inputs.payload`',
            source: 'variables',
          },
        ],
      });
      const tool = manageActionPolicyTool(deps);
      const ctx = createContext();

      const result = await tool.handler(
        {
          operations: [
            { operation: 'set_metadata', name: 'Variable Ref Warning Policy' },
            {
              operation: 'set_destinations',
              destinations: [{ type: 'workflow', id: 'wf-1' }],
            },
          ],
        },
        ctx
      );

      const { results } = result as {
        results: Array<{
          type: string;
          data?: {
            workflowDiagnostics?: Array<{ destinationId: string; source: string; message: string }>;
          };
        }>;
      };
      expect(deps.validateWorkflow).toHaveBeenCalled();
      expect(results[0].type).toBe(ToolResultType.other);
      expect(results[0].data?.workflowDiagnostics).toEqual([
        expect.objectContaining({
          destinationId: 'wf-1',
          source: 'workflow-validation',
          message: expect.stringContaining('episodez'),
        }),
      ]);
    });

    it('omits workflowDiagnostics entirely when the destination workflow is fully valid', async () => {
      const deps = createDeps();
      deps.getWorkflow = jest.fn().mockResolvedValue({
        id: 'wf-1',
        name: 'Fully valid workflow',
        yaml: [
          'name: notify',
          'triggers:',
          '  - type: manual',
          '    inputs:',
          '      properties:',
          '        payload:',
          "          $ref: '#/kibana/definitions/alertingV2NotificationGroup'",
        ].join('\n'),
      });
      deps.validateWorkflow = jest.fn().mockResolvedValue({ valid: true, diagnostics: [] });
      const tool = manageActionPolicyTool(deps);
      const ctx = createContext();

      const result = await tool.handler(
        {
          operations: [
            { operation: 'set_metadata', name: 'Clean Policy' },
            {
              operation: 'set_destinations',
              destinations: [{ type: 'workflow', id: 'wf-1' }],
            },
          ],
        },
        ctx
      );

      const { results } = result as {
        results: Array<{ type: string; data?: Record<string, unknown> }>;
      };
      expect(results[0].type).toBe(ToolResultType.other);
      expect(results[0].data).not.toHaveProperty('workflowDiagnostics');
    });
  });

  it('creates a rule-scoped policy with the rule.id matcher in the result', async () => {
    const deps = createDeps();
    const tool = manageActionPolicyTool(deps);
    const ctx = createContext();

    const result = await tool.handler(
      {
        operations: [
          { operation: 'set_metadata', name: 'Rule-scoped Policy', description: 'desc' },
          {
            operation: 'set_destinations',
            destinations: [{ type: 'workflow', id: 'wf-1' }],
          },
          { operation: 'set_matcher', matcher: { tags: ['rule-abc'] } },
        ],
      },
      ctx
    );

    const { results } = result as {
      results: Array<{
        type: string;
        data?: {
          actionPolicyAttachment?: {
            matcher?: unknown;
            name?: string;
          };
        };
      }>;
    };
    expect(results[0].type).toBe(ToolResultType.other);
    expect(results[0].data?.actionPolicyAttachment?.matcher).toEqual({ tags: ['rule-abc'] });
    expect(results[0].data?.actionPolicyAttachment?.name).toBe('Rule-scoped Policy');
  });

  describe('logger severity', () => {
    it('logs validation errors at debug level', async () => {
      const logger = createLogger();
      const deps = createDeps(logger as unknown as LoggerServiceContract);
      const tool = manageActionPolicyTool(deps);
      const ctx = createContext();

      await tool.handler(
        {
          operations: [
            {
              operation: 'set_destinations',
              destinations: [{ type: 'workflow', id: 'wf-1' }],
            },
          ],
        },
        ctx
      );

      expect(logger.debug).toHaveBeenCalledWith({
        message: 'Invalid manage_action_policy input',
        labels: { space_id: ctx.spaceId },
      });
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('logs unexpected errors at warn level', async () => {
      const logger = createLogger();
      const deps = createDeps(logger as unknown as LoggerServiceContract);
      const tool = manageActionPolicyTool(deps);
      const ctx = createContext();
      ctx.attachments.add.mockRejectedValueOnce(new Error('ES exploded'));

      await tool.handler(
        {
          operations: [
            { operation: 'set_metadata', name: 'Boom' },
            {
              operation: 'set_destinations',
              destinations: [{ type: 'workflow', id: 'wf-1' }],
            },
          ],
        },
        ctx
      );

      expect(logger.warn).toHaveBeenCalledWith({
        message: 'Failed to manage action policy',
        code: ALERTING_LOG_CODES.AGENT_BUILDER_MANAGE_ACTION_POLICY_FAILED,
        labels: { space_id: ctx.spaceId, policy_id: expect.any(String) },
        error: expect.any(Error),
      });
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('includes policy_id on unexpected errors when the policy is already persisted', async () => {
      const logger = createLogger();
      const deps = createDeps(logger as unknown as LoggerServiceContract);
      const tool = manageActionPolicyTool(deps);
      const ctx = createContext();
      ctx.attachments.getAttachmentRecord.mockReturnValue({
        origin: 'policy-persisted-id',
        versions: [
          {
            data: {
              id: 'policy-persisted-id',
              name: 'Existing Policy',
              destinations: [{ type: 'workflow', id: 'wf-1' }],
            },
          },
        ],
      } as never);
      ctx.attachments.update.mockRejectedValueOnce(new Error('ES exploded'));

      await tool.handler(
        {
          actionPolicyAttachmentId: 'attachment-1',
          operations: [{ operation: 'set_metadata', name: 'Boom' }],
        },
        ctx
      );

      expect(logger.warn).toHaveBeenCalledWith({
        message: 'Failed to manage action policy',
        code: ALERTING_LOG_CODES.AGENT_BUILDER_MANAGE_ACTION_POLICY_FAILED,
        labels: { space_id: ctx.spaceId, policy_id: 'policy-persisted-id' },
        error: expect.any(Error),
      });
    });

    it('includes policy_id on unexpected errors when the policy is only in memory', async () => {
      const logger = createLogger();
      const deps = createDeps(logger as unknown as LoggerServiceContract);
      const tool = manageActionPolicyTool(deps);
      const ctx = createContext();
      ctx.attachments.getAttachmentRecord.mockReturnValue({
        versions: [
          {
            data: {
              id: 'policy-in-memory-id',
              name: 'Draft Policy',
              destinations: [{ type: 'workflow', id: 'wf-1' }],
            },
          },
        ],
      } as never);
      ctx.attachments.update.mockRejectedValueOnce(new Error('ES exploded'));

      await tool.handler(
        {
          actionPolicyAttachmentId: 'attachment-1',
          operations: [{ operation: 'set_metadata', name: 'Boom' }],
        },
        ctx
      );

      expect(logger.warn).toHaveBeenCalledWith({
        message: 'Failed to manage action policy',
        code: ALERTING_LOG_CODES.AGENT_BUILDER_MANAGE_ACTION_POLICY_FAILED,
        labels: { space_id: ctx.spaceId, policy_id: 'policy-in-memory-id' },
        error: expect.any(Error),
      });
    });
  });
});
