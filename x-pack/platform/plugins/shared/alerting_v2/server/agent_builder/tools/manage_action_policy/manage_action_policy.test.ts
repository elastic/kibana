/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import type { ToolHandlerContextMock } from '@kbn/agent-builder-plugin/server/mocks';
import { WORKFLOW_YAML_ATTACHMENT_TYPE } from '@kbn/workflows/common/constants';
import { manageActionPolicyTool, type ManageActionPolicyToolDeps } from './manage_action_policy';
import { AGENT_BUILDER_TAG } from '../../common/constants';

const createDeps = (): ManageActionPolicyToolDeps => ({
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

      // The agent-builder-assisted tag is stamped on the data persisted via update()
      const updateCall = ctx.attachments.update.mock.calls[0][1] as {
        data: { tags?: string[] };
      };
      expect(updateCall.data.tags).toContain(AGENT_BUILDER_TAG);
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

    describe('destination workflow compatibility', () => {
      const compatibleYaml = `
version: '1'
name: Notify
enabled: true
triggers:
  - type: manual
steps:
  - name: send_email
    type: email
    with:
      message: "{{ inputs.payload.episodes | size }} episode(s)"
`;
      const incompatibleYaml = `
version: '1'
name: Notify
enabled: true
triggers:
  - type: manual
steps:
  - name: send_email
    type: email
    with:
      message: "{{ inputs.payload.bogus_field }}"
`;

      const createDepsWithWorkflowYaml = (yaml: string): ManageActionPolicyToolDeps => ({
        getWorkflow: jest.fn().mockResolvedValue({ id: 'wf-1', name: 'My Workflow', yaml }),
        getAvailableConnectors: jest.fn().mockResolvedValue({ connectorTypes: {} }),
      });

      const setDestinationOperations = [
        { operation: 'set_metadata' as const, name: 'Notify Policy' },
        {
          operation: 'set_destinations' as const,
          destinations: [{ type: 'workflow' as const, id: 'wf-1' }],
        },
      ];

      it('blocks a new policy whose destination workflow is incompatible', async () => {
        const tool = manageActionPolicyTool(createDepsWithWorkflowYaml(incompatibleYaml));
        const ctx = createContext();

        const result = await tool.handler({ operations: setDestinationOperations }, ctx);

        const { results } = result as {
          results: Array<{ type: string; data: { message: string } }>;
        };
        expect(results[0].type).toBe(ToolResultType.error);
        expect(results[0].data.message).toContain(
          'Destination workflow "wf-1": Generated workflow Liquid references unknown `inputs.payload` fields'
        );
        expect(ctx.attachments.add).not.toHaveBeenCalled();
      });

      it('creates a new policy without warnings when the destination workflow is compatible', async () => {
        const tool = manageActionPolicyTool(createDepsWithWorkflowYaml(compatibleYaml));
        const ctx = createContext();

        const result = await tool.handler({ operations: setDestinationOperations }, ctx);

        const { results } = result as {
          results: Array<{ type: string; data?: { warnings?: string[] } }>;
        };
        expect(results[0].type).toBe(ToolResultType.other);
        expect(results[0].data?.warnings).toBeUndefined();
        expect(ctx.attachments.add).toHaveBeenCalledTimes(1);
      });

      it('warns instead of blocking when editing a policy with an incompatible workflow', async () => {
        const tool = manageActionPolicyTool(createDepsWithWorkflowYaml(incompatibleYaml));
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
            operations: [{ operation: 'set_throttle', strategy: 'every_time' }],
          },
          ctx
        );

        const { results } = result as {
          results: Array<{ type: string; data?: { warnings?: string[] } }>;
        };
        expect(results[0].type).toBe(ToolResultType.other);
        expect(results[0].data?.warnings).toEqual([
          expect.stringContaining(
            'Destination workflow "wf-1": Generated workflow Liquid references unknown `inputs.payload` fields'
          ),
        ]);
        expect(ctx.attachments.update).toHaveBeenCalledTimes(1);
      });

      it('surfaces warning-only issues on a new policy without blocking it', async () => {
        const tool = manageActionPolicyTool(
          createDepsWithWorkflowYaml(compatibleYaml.replace('enabled: true', 'enabled: false'))
        );
        const ctx = createContext();

        const result = await tool.handler({ operations: setDestinationOperations }, ctx);

        const { results } = result as {
          results: Array<{ type: string; data?: { warnings?: string[] } }>;
        };
        expect(results[0].type).toBe(ToolResultType.other);
        expect(results[0].data?.warnings).toEqual([
          expect.stringContaining('Destination workflow "wf-1": Generated workflow is disabled.'),
        ]);
        expect(ctx.attachments.add).toHaveBeenCalledTimes(1);
      });

      it('skips compatibility checks when the workflow definition is unavailable', async () => {
        const tool = manageActionPolicyTool(createDeps());
        const ctx = createContext();

        const result = await tool.handler({ operations: setDestinationOperations }, ctx);

        const { results } = result as {
          results: Array<{ type: string; data?: { warnings?: string[] } }>;
        };
        expect(results[0].type).toBe(ToolResultType.other);
        expect(results[0].data?.warnings).toBeUndefined();
      });

      it('validates the workflow YAML attached in this conversation', async () => {
        const tool = manageActionPolicyTool({
          getWorkflow: jest.fn().mockResolvedValue(null),
          getAvailableConnectors: jest.fn().mockResolvedValue({ connectorTypes: {} }),
        });
        const ctx = createContext();
        (ctx.attachments as any).getActive = jest.fn().mockReturnValue([
          {
            id: 'att-wf-1',
            type: WORKFLOW_YAML_ATTACHMENT_TYPE,
            versions: [{ data: { workflowId: 'wf-1', yaml: incompatibleYaml } }],
          },
        ]);

        const result = await tool.handler({ operations: setDestinationOperations }, ctx);

        const { results } = result as {
          results: Array<{ type: string; data: { message: string } }>;
        };
        expect(results[0].type).toBe(ToolResultType.error);
        expect(results[0].data.message).toContain('Destination workflow "wf-1"');
      });
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
          { operation: 'set_matcher', matcher: 'rule.id: "rule-abc"' },
        ],
      },
      ctx
    );

    const { results } = result as {
      results: Array<{
        type: string;
        data?: {
          actionPolicyAttachment?: {
            matcher?: string | null;
            name?: string;
          };
        };
      }>;
    };
    expect(results[0].type).toBe(ToolResultType.other);
    expect(results[0].data?.actionPolicyAttachment?.matcher).toBe('rule.id: "rule-abc"');
    expect(results[0].data?.actionPolicyAttachment?.name).toBe('Rule-scoped Policy');
  });

  describe('logger severity', () => {
    it('logs validation errors at debug level', async () => {
      const deps = createDeps();
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

      expect(ctx.logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('manage_action_policy tool: invalid input')
      );
      expect(ctx.logger.error).not.toHaveBeenCalled();
    });

    it('logs unexpected errors at warn level', async () => {
      const deps = createDeps();
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

      expect(ctx.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Error in manage_action_policy tool')
      );
      expect(ctx.logger.error).not.toHaveBeenCalled();
    });
  });
});
