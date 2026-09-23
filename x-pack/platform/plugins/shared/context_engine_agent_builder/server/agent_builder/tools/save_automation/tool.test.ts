/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { AI_INDEX_ATTACHMENT_TYPE } from '../../../../common/agent_builder_attachments';
import { CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID } from '../../../../common/agent_builder_tools';
import { WORKFLOW_YAML_ATTACHMENT_TYPE } from '@kbn/workflows/common/constants';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { createSaveAutomationTool } from './tool';

jest.mock('@kbn/agent-builder-tools-base/workflows', () => ({
  hasWorkflowReadPrivilege: jest.fn().mockResolvedValue(true),
  hasWorkflowExecutePrivilege: jest.fn().mockResolvedValue(true),
}));

const { hasWorkflowReadPrivilege, hasWorkflowExecutePrivilege } = jest.requireMock(
  '@kbn/agent-builder-tools-base/workflows'
);

describe('save_automation tool', () => {
  const getWorkflowMock = jest.fn();

  const createTool = () =>
    createSaveAutomationTool({
      getAiIndexService: async () => {
        throw new Error('not used');
      },
      getCoreStart: async () => {
        throw new Error('not used');
      },
      getSecurityStart: async () => undefined,
      getWorkflowsManagement: () =>
        ({
          getWorkflow: getWorkflowMock,
        } as never),
    });

  const createAttachments = (): AttachmentStateManager =>
    ({
      getAll: jest.fn().mockReturnValue([
        {
          id: 'attachment-1',
          type: WORKFLOW_YAML_ATTACHMENT_TYPE,
          current_version: 1,
          versions: [
            {
              version: 1,
              data: {
                yaml: 'name: Index Metadata Pilot\nsteps: []',
                name: 'Index Metadata Pilot',
              },
            },
          ],
        },
        {
          id: 'ai-index-attachment',
          type: AI_INDEX_ATTACHMENT_TYPE,
          current_version: 1,
          versions: [
            {
              version: 1,
              data: {
                id: 'my-ai-index',
                description: 'Support tickets index',
              },
            },
          ],
        },
      ]),
    } as unknown as AttachmentStateManager);

  const createConfirmationContext = (
    toolParams: {
      workflowAttachmentId?: string;
      workflowYaml?: string;
      workflowId?: string;
      aiIndexId?: string;
      run?: boolean;
    },
    attachments: AttachmentStateManager = createAttachments(),
    spaceId = 'default'
  ) => {
    const handlerContext = agentBuilderMocks.tools.createHandlerContext();
    return {
      toolParams,
      context: {
        ...handlerContext,
        attachments,
        request: httpServerMock.createKibanaRequest(),
        spaceId,
      },
    };
  };

  beforeEach(() => {
    getWorkflowMock.mockReset();
    hasWorkflowReadPrivilege.mockClear().mockResolvedValue(true);
    hasWorkflowExecutePrivilege.mockClear().mockResolvedValue(true);
  });

  it('uses the expected tool id', () => {
    expect(createTool().id).toBe(CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID);
  });

  it('uses always confirmation policy with workflow and ai index names', async () => {
    const tool = createTool();
    const attachments = createAttachments();

    expect(tool.confirmation?.askUser).toBe('always');

    const draftConfirmation = await tool.confirmation?.getConfirmation?.(
      createConfirmationContext(
        {
          workflowAttachmentId: 'attachment-1',
          aiIndexId: 'my-ai-index',
        },
        attachments
      )
    );

    expect(draftConfirmation).toEqual(
      expect.objectContaining({
        title: 'Save workflow automation',
        confirm_text: 'Save and attach',
        cancel_text: 'Cancel',
      })
    );
    expect(draftConfirmation?.message).toContain('workflow "Index Metadata Pilot"');
    expect(draftConfirmation?.message).toContain('AI index "Support tickets index"');
    expect(draftConfirmation?.message).not.toContain('attachment-1');
  });

  it('falls back to workflow id when the saved workflow name cannot be resolved', async () => {
    const tool = createTool();
    getWorkflowMock.mockResolvedValue(undefined);

    const savedConfirmation = await tool.confirmation?.getConfirmation?.(
      createConfirmationContext({
        workflowId: 'workflow-1',
      })
    );

    expect(savedConfirmation?.message).toContain('workflow "workflow-1"');
    expect(getWorkflowMock).toHaveBeenCalledWith('workflow-1', 'default');
  });

  it('uses the saved workflow name when workflowId is provided', async () => {
    const tool = createTool();
    getWorkflowMock.mockResolvedValue({ id: 'workflow-1', name: 'Existing Pilot' });

    const savedConfirmation = await tool.confirmation?.getConfirmation?.(
      createConfirmationContext({
        workflowId: 'workflow-1',
      })
    );

    expect(savedConfirmation?.message).toContain('workflow "Existing Pilot"');
  });

  it('names the workflow from the yaml when it was authored outside generate_workflow', async () => {
    const tool = createTool();

    const confirmation = await tool.confirmation?.getConfirmation?.(
      createConfirmationContext({
        workflowYaml: 'name: "Authored Pilot"\nsteps: []',
        aiIndexId: 'my-ai-index',
      })
    );

    expect(confirmation?.message).toContain('workflow "Authored Pilot"');
  });

  it('falls back to a generic label when the yaml carries no name', async () => {
    const tool = createTool();

    const confirmation = await tool.confirmation?.getConfirmation?.(
      createConfirmationContext({
        workflowYaml: 'steps: []',
        aiIndexId: 'my-ai-index',
      })
    );

    expect(confirmation?.message).toContain('the drafted workflow');
  });

  it('does not resolve workflow names without read privilege', async () => {
    hasWorkflowReadPrivilege.mockResolvedValue(false);
    const tool = createTool();
    getWorkflowMock.mockResolvedValue({ id: 'workflow-1', name: 'Secret Workflow' });

    const savedConfirmation = await tool.confirmation?.getConfirmation?.(
      createConfirmationContext({
        workflowId: 'workflow-1',
      })
    );

    expect(savedConfirmation?.message).toContain('workflow "workflow-1"');
    expect(savedConfirmation?.message).not.toContain('Secret Workflow');
    expect(getWorkflowMock).not.toHaveBeenCalled();
  });

  describe('run confirmation', () => {
    it('discloses the full-corpus run in the dialog the user approves', async () => {
      const tool = createTool();

      const confirmation = await tool.confirmation?.getConfirmation?.(
        createConfirmationContext({
          workflowAttachmentId: 'attachment-1',
          aiIndexId: 'my-ai-index',
          run: true,
        })
      );

      expect(confirmation).toEqual(
        expect.objectContaining({
          title: 'Save and run workflow automation',
          confirm_text: 'Save and run',
          cancel_text: 'Cancel',
        })
      );
      expect(confirmation?.message).toContain('run it now over the full corpus');
      expect(confirmation?.message).toContain('workflow "Index Metadata Pilot"');
    });

    it('degrades to a plain save when the caller cannot execute workflows', async () => {
      hasWorkflowExecutePrivilege.mockResolvedValue(false);
      const tool = createTool();

      const confirmation = await tool.confirmation?.getConfirmation?.(
        createConfirmationContext({
          workflowAttachmentId: 'attachment-1',
          aiIndexId: 'my-ai-index',
          run: true,
        })
      );

      expect(confirmation).toEqual(
        expect.objectContaining({
          title: 'Save workflow automation',
          confirm_text: 'Save and attach',
        })
      );
      expect(confirmation?.message).not.toContain('full corpus');
    });

    it('discloses that running enables the workflow for good, not just for the run', async () => {
      const tool = createTool();

      const confirmation = await tool.confirmation?.getConfirmation?.(
        createConfirmationContext({
          workflowYaml: 'name: Pilot\nenabled: false\nsteps: []',
          aiIndexId: 'my-ai-index',
          run: true,
        })
      );

      expect(confirmation?.message).toContain('stays enabled afterwards even if the run fails');
    });

    it('says nothing about enabling when the definition is already enabled', async () => {
      const tool = createTool();

      const confirmation = await tool.confirmation?.getConfirmation?.(
        createConfirmationContext({
          workflowYaml: 'name: Pilot\nenabled: true\nsteps: []',
          aiIndexId: 'my-ai-index',
          run: true,
        })
      );

      expect(confirmation?.message).not.toContain('stays enabled');
    });

    it('reads the enabled flag off the stored workflow when attaching one by id', async () => {
      const tool = createTool();
      getWorkflowMock.mockResolvedValue({ id: 'workflow-1', name: 'Saved', enabled: true });

      const confirmation = await tool.confirmation?.getConfirmation?.(
        createConfirmationContext({
          workflowId: 'workflow-1',
          aiIndexId: 'my-ai-index',
          run: true,
        })
      );

      expect(confirmation?.message).not.toContain('stays enabled');
    });

    it('does not mention enabling on a save that is not running anything', async () => {
      hasWorkflowExecutePrivilege.mockResolvedValue(false);
      const tool = createTool();

      const confirmation = await tool.confirmation?.getConfirmation?.(
        createConfirmationContext({
          workflowYaml: 'name: Pilot\nenabled: false\nsteps: []',
          aiIndexId: 'my-ai-index',
          run: true,
        })
      );

      expect(confirmation?.message).not.toContain('stays enabled');
    });

    it('does not check the execute privilege when no run was asked for', async () => {
      const tool = createTool();

      await tool.confirmation?.getConfirmation?.(
        createConfirmationContext({
          workflowAttachmentId: 'attachment-1',
          aiIndexId: 'my-ai-index',
        })
      );

      expect(hasWorkflowExecutePrivilege).not.toHaveBeenCalled();
    });
  });

  describe('overwrite confirmation', () => {
    it('says an existing workflow is being replaced when yaml targets one by id', async () => {
      const tool = createTool();
      getWorkflowMock.mockResolvedValue({ id: 'workflow-1', name: 'Carrier profile automation' });

      const confirmation = await tool.confirmation?.getConfirmation?.(
        createConfirmationContext({
          workflowYaml: 'name: "Carrier profile automation"\nsteps: []',
          workflowId: 'workflow-1',
          aiIndexId: 'my-ai-index',
        })
      );

      expect(confirmation).toEqual(
        expect.objectContaining({
          title: 'Replace workflow automation',
          confirm_text: 'Replace',
          cancel_text: 'Cancel',
        })
      );
      expect(confirmation?.message).toContain('replaces the saved definition');
      expect(confirmation?.message).toContain('"Carrier profile automation"');
      expect(confirmation?.message).toContain('cannot be recovered');
    });

    it('calls out a rename, which otherwise reads as a new automation', async () => {
      const tool = createTool();
      getWorkflowMock.mockResolvedValue({ id: 'workflow-1', name: 'Old name' });

      const confirmation = await tool.confirmation?.getConfirmation?.(
        createConfirmationContext({
          workflowYaml: 'name: "New name"\nsteps: []',
          workflowId: 'workflow-1',
          aiIndexId: 'my-ai-index',
        })
      );

      expect(confirmation?.message).toContain('"Old name"');
      expect(confirmation?.message).toContain('renamed to "New name"');
    });

    it('does not claim a rename when the definition keeps the same name', async () => {
      const tool = createTool();
      getWorkflowMock.mockResolvedValue({ id: 'workflow-1', name: 'Same name' });

      const confirmation = await tool.confirmation?.getConfirmation?.(
        createConfirmationContext({
          workflowYaml: 'name: "Same name"\nsteps: []',
          workflowId: 'workflow-1',
          aiIndexId: 'my-ai-index',
        })
      );

      expect(confirmation?.message).not.toContain('renamed');
    });

    it('treats re-saving an attachment already saved once as the overwrite it is', async () => {
      const tool = createTool();
      getWorkflowMock.mockResolvedValue({ id: 'workflow-7', name: 'Index Metadata Pilot' });
      const attachments = {
        getAll: jest.fn().mockReturnValue([
          {
            id: 'attachment-1',
            type: WORKFLOW_YAML_ATTACHMENT_TYPE,
            origin: 'workflow-7',
            current_version: 1,
            versions: [
              {
                version: 1,
                data: { yaml: 'name: Index Metadata Pilot\nsteps: []' },
              },
            ],
          },
        ]),
      } as unknown as AttachmentStateManager;

      const confirmation = await tool.confirmation?.getConfirmation?.(
        createConfirmationContext(
          { workflowAttachmentId: 'attachment-1', aiIndexId: 'my-ai-index' },
          attachments
        )
      );

      expect(confirmation?.title).toBe('Replace workflow automation');
      expect(getWorkflowMock).toHaveBeenCalledWith('workflow-7', 'default');
    });

    it('still offers a plain save when the attachment has never been saved', async () => {
      const tool = createTool();

      const confirmation = await tool.confirmation?.getConfirmation?.(
        createConfirmationContext({
          workflowAttachmentId: 'attachment-1',
          aiIndexId: 'my-ai-index',
        })
      );

      expect(confirmation?.title).toBe('Save workflow automation');
      expect(confirmation?.message).not.toContain('replaces');
    });

    it('folds the run into the replace, so one dialog covers both', async () => {
      const tool = createTool();
      getWorkflowMock.mockResolvedValue({ id: 'workflow-1', name: 'Carrier profile automation' });

      const confirmation = await tool.confirmation?.getConfirmation?.(
        createConfirmationContext({
          workflowYaml: 'name: "Carrier profile automation"\nsteps: []',
          workflowId: 'workflow-1',
          aiIndexId: 'my-ai-index',
          run: true,
        })
      );

      expect(confirmation).toEqual(
        expect.objectContaining({
          title: 'Replace and run workflow automation',
          confirm_text: 'Replace and run',
        })
      );
      expect(confirmation?.message).toContain('replaces the saved definition');
      expect(confirmation?.message).toContain('full corpus');
    });

    it('names the target by id when the workflow name cannot be read', async () => {
      hasWorkflowReadPrivilege.mockResolvedValue(false);
      const tool = createTool();

      const confirmation = await tool.confirmation?.getConfirmation?.(
        createConfirmationContext({
          workflowYaml: 'name: "Draft"\nsteps: []',
          workflowId: 'workflow-1',
          aiIndexId: 'my-ai-index',
        })
      );

      expect(confirmation?.title).toBe('Replace workflow automation');
      expect(confirmation?.message).toContain('with id "workflow-1"');
    });
  });

  describe('schema', () => {
    const parse = (params: Record<string, unknown>) =>
      createTool().schema.safeParse({ aiIndexId: 'my-ai-index', ...params });

    it('accepts a definition paired with the id of the workflow it replaces', () => {
      expect(parse({ workflowYaml: 'name: x', workflowId: 'workflow-1' }).success).toBe(true);
      expect(
        parse({ workflowAttachmentId: 'attachment-1', workflowId: 'workflow-1' }).success
      ).toBe(true);
    });

    it('still accepts each source on its own', () => {
      expect(parse({ workflowYaml: 'name: x' }).success).toBe(true);
      expect(parse({ workflowAttachmentId: 'attachment-1' }).success).toBe(true);
      expect(parse({ workflowId: 'workflow-1' }).success).toBe(true);
    });

    it('rejects two definitions, which would be ambiguous about what gets saved', () => {
      expect(parse({ workflowYaml: 'name: x', workflowAttachmentId: 'attachment-1' }).success).toBe(
        false
      );
    });

    it('rejects a call with nothing to save or attach', () => {
      expect(parse({}).success).toBe(false);
    });

    it('does not tie the run to saving, which would read as excluding an attach', () => {
      const description = createTool().schema.shape.run.description ?? '';

      expect(description).toMatch(/saved or attached/);
      expect(description).toMatch(/including attaching a workflow that was already saved/);
      expect(description).toMatch(/stays enabled afterwards/);
    });
  });
});
