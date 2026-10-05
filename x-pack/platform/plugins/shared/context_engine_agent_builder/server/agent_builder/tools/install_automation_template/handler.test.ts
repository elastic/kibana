/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { AiIndexService } from '@kbn/context-engine-plugin/server/ai_indices/service';
import { AI_INDEX_ATTACHMENT_TYPE } from '../../../../common/agent_builder_attachments';
import { saveAutomationHandler } from '../save_automation/handler';
import { assertContextEngineWriteAccess } from '../../assert_context_engine_write_access';
import { installAutomationTemplateHandler } from './handler';

jest.mock('../../assert_context_engine_write_access', () => ({
  assertContextEngineWriteAccess: jest.fn().mockResolvedValue(undefined),
}));
import { AUTOMATION_TEMPLATE_TAGS } from './render';

jest.mock('../save_automation/handler', () => {
  const actual = jest.requireActual('../save_automation/handler');
  return {
    ...actual,
    saveAutomationHandler: jest.fn().mockResolvedValue({
      aiIndexId: 'airline-loyalty',
      workflowId: 'wf-saved',
      status: 'saved_and_attached',
    }),
  };
});

const saveAutomationHandlerMock = saveAutomationHandler as jest.MockedFunction<
  typeof saveAutomationHandler
>;

describe('installAutomationTemplateHandler', () => {
  const getWorkflow = jest.fn();

  const createDeps = (automations: Array<{ type: 'workflow'; value: string }>) => ({
    request: httpServerMock.createKibanaRequest(),
    spaceId: 'default',
    attachments: {
      getAll: () => [
        {
          id: 'ai-index-attachment',
          type: AI_INDEX_ATTACHMENT_TYPE,
          current_version: 1,
          versions: [{ version: 1, data: { id: 'airline-loyalty' } }],
        },
      ],
    } as never,
    logger: loggingSystemMock.createLogger(),
    getAiIndexService: async () =>
      ({
        get: async () => ({ automations }),
      } as unknown as AiIndexService),
    getCoreStart: async () => ({} as never),
    getSecurityStart: async () => undefined,
    getWorkflowsManagement: () => ({ getWorkflow } as never),
  });

  const documentParams = {
    template: 'document_orchestration' as const,
    name: 'flight-activity-docs',
    sourceIndex: 'loyalty-docs',
    titleField: 'title',
    bodyField: 'body',
    corpusFilter: '',
    maxDocuments: 50,
    bodyMaxChars: 12000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('saves a new workflow when the template is not attached', async () => {
    const result = await installAutomationTemplateHandler({
      params: documentParams,
      ...createDeps([]),
    });

    expect(result.workflowId).toBe('wf-saved');
    expect(result.replaced).toBe(false);
    expect(saveAutomationHandlerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          aiIndexId: 'airline-loyalty',
        }),
      })
    );
    expect(saveAutomationHandlerMock.mock.calls[0][0].params).not.toHaveProperty('workflowId');
    const yaml = saveAutomationHandlerMock.mock.calls[0][0].params.workflowYaml;
    expect(yaml).toContain(AUTOMATION_TEMPLATE_TAGS.document_orchestration);
  });

  it('does not overwrite a tagged workflow whose name differs from the requested name', async () => {
    // A differently-named tagged automation of the same template type must not be overwritten;
    // the new name is a distinct automation and should be installed alongside the existing one.
    getWorkflow.mockResolvedValue({
      id: 'wf-existing',
      name: 'different-automation-name',
      tags: [AUTOMATION_TEMPLATE_TAGS.document_orchestration],
    });

    const result = await installAutomationTemplateHandler({
      params: documentParams,
      ...createDeps([{ type: 'workflow', value: 'wf-existing' }]),
    });

    expect(result.replaced).toBe(false);
    expect(saveAutomationHandlerMock.mock.calls[0][0].params).not.toHaveProperty('workflowId');
  });

  it('overwrites an existing workflow whose name matches the requested name regardless of tag', async () => {
    getWorkflow.mockResolvedValue({
      id: 'wf-existing',
      name: 'flight-activity-docs',
      tags: [AUTOMATION_TEMPLATE_TAGS.document_orchestration],
    });

    const result = await installAutomationTemplateHandler({
      params: documentParams,
      ...createDeps([{ type: 'workflow', value: 'wf-existing' }]),
    });

    expect(result.replaced).toBe(true);
    expect(saveAutomationHandlerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          workflowId: 'wf-existing',
          aiIndexId: 'airline-loyalty',
        }),
      })
    );
  });

  it('overwrites a workflow saved before the tag existed when the name matches', async () => {
    getWorkflow.mockResolvedValue({
      id: 'wf-by-name',
      name: 'flight-activity-docs',
      tags: ['document-ki'],
    });

    await installAutomationTemplateHandler({
      params: documentParams,
      ...createDeps([{ type: 'workflow', value: 'wf-by-name' }]),
    });

    expect(saveAutomationHandlerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ workflowId: 'wf-by-name' }),
      })
    );
  });

  it('leaves an unrelated automation alone', async () => {
    getWorkflow.mockResolvedValue({
      id: 'wf-other',
      name: 'Unit profiles',
      tags: ['unit'],
    });

    await installAutomationTemplateHandler({
      params: documentParams,
      ...createDeps([{ type: 'workflow', value: 'wf-other' }]),
    });

    expect(saveAutomationHandlerMock.mock.calls[0][0].params).not.toHaveProperty('workflowId');
  });

  it('creates an index metadata automation when only the orchestration is attached', async () => {
    getWorkflow.mockResolvedValue({
      id: 'wf-orchestration',
      name: 'Document KI orchestration',
      tags: [AUTOMATION_TEMPLATE_TAGS.document_orchestration],
    });

    await installAutomationTemplateHandler({
      params: {
        template: 'index_metadata',
        name: 'loyalty-index-metadata',
        sourceIndex: 'loyalty-docs',
        categoryField: 'tier',
      },
      ...createDeps([{ type: 'workflow', value: 'wf-orchestration' }]),
    });

    expect(saveAutomationHandlerMock.mock.calls[0][0].params).not.toHaveProperty('workflowId');
    expect(saveAutomationHandlerMock.mock.calls[0][0].params.workflowYaml).toContain(
      AUTOMATION_TEMPLATE_TAGS.index_metadata
    );
  });

  it('overwrites the index metadata automation when its name matches', async () => {
    getWorkflow.mockResolvedValue({
      id: 'wf-metadata',
      name: 'loyalty-index-metadata',
      tags: [AUTOMATION_TEMPLATE_TAGS.index_metadata],
    });

    await installAutomationTemplateHandler({
      params: {
        template: 'index_metadata',
        name: 'loyalty-index-metadata',
        sourceIndex: 'loyalty-docs',
        categoryField: 'tier',
      },
      ...createDeps([{ type: 'workflow', value: 'wf-metadata' }]),
    });

    expect(saveAutomationHandlerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ workflowId: 'wf-metadata' }),
      })
    );
  });

  it('renders the unit profile and attaches it', async () => {
    await installAutomationTemplateHandler({
      params: {
        template: 'unit_profile',
        name: 'loyalty-province-profile',
        unitIndex: 'loyalty-history',
        unitKey: 'Province',
        activityField: 'Enrollment Date',
        breakdownField: 'Loyalty Card',
        corpusFilter: '',
        maxUnits: 25,
      },
      ...createDeps([]),
    });

    const yaml = saveAutomationHandlerMock.mock.calls[0][0].params.workflowYaml;
    expect(yaml).toContain(AUTOMATION_TEMPLATE_TAGS.unit_profile);
    expect(yaml).toContain('unit_key: "Province"');
  });

  it('overwrites the unit profile automation when its name matches', async () => {
    getWorkflow.mockResolvedValue({
      id: 'wf-unit',
      name: 'loyalty-province-profile',
      tags: [AUTOMATION_TEMPLATE_TAGS.unit_profile],
    });

    const result = await installAutomationTemplateHandler({
      params: {
        template: 'unit_profile',
        name: 'loyalty-province-profile',
        unitIndex: 'loyalty-history',
        unitKey: 'Province',
        activityField: 'Enrollment Date',
        breakdownField: 'Loyalty Card',
        corpusFilter: '',
        maxUnits: 25,
      },
      ...createDeps([{ type: 'workflow', value: 'wf-unit' }]),
    });

    expect(result.replaced).toBe(true);
    expect(saveAutomationHandlerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ workflowId: 'wf-unit' }),
      })
    );
  });

  it('renders the targeted_ki_writer with the provided kis and attaches it', async () => {
    const kisYaml = `- ki_id: constraint-foo\n  ki:\n    type: constraint\n    title: "Foo constraint"\n    description: "desc"\n    content: "content"\n    tags:\n      - constraint\n    references:\n      - uri: index://foo\n        relation: derived_from`;

    await installAutomationTemplateHandler({
      params: { template: 'targeted_ki_writer', name: 'loyalty-constraints', kis: kisYaml },
      ...createDeps([]),
    });

    const yaml = saveAutomationHandlerMock.mock.calls[0][0].params.workflowYaml;
    expect(yaml).toContain(AUTOMATION_TEMPLATE_TAGS.targeted_ki_writer);
    expect(yaml).toContain('ki_id: constraint-foo');
  });

  it('overwrites targeted_ki_writer when its name matches', async () => {
    getWorkflow.mockResolvedValue({
      id: 'wf-ki-writer',
      name: 'loyalty-constraints',
      tags: [AUTOMATION_TEMPLATE_TAGS.targeted_ki_writer],
    });
    const kisYaml = `- ki_id: constraint-foo\n  ki:\n    type: constraint\n    title: "T"\n    description: "D"\n    content: "C"\n    tags:\n      - constraint\n    references:\n      - uri: index://foo\n        relation: derived_from`;

    const result = await installAutomationTemplateHandler({
      params: { template: 'targeted_ki_writer', name: 'loyalty-constraints', kis: kisYaml },
      ...createDeps([{ type: 'workflow', value: 'wf-ki-writer' }]),
    });

    expect(result.replaced).toBe(true);
    expect(saveAutomationHandlerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ workflowId: 'wf-ki-writer' }),
      })
    );
  });

  it('does not create a second automation when reading an attached workflow fails', async () => {
    getWorkflow.mockRejectedValue(new Error('workflow read failed'));

    await expect(
      installAutomationTemplateHandler({
        params: documentParams,
        ...createDeps([{ type: 'workflow', value: 'wf-existing' }]),
      })
    ).rejects.toThrow('workflow read failed');

    expect(saveAutomationHandlerMock).not.toHaveBeenCalled();
  });

  it('injects the provided name into the rendered workflow YAML', async () => {
    await installAutomationTemplateHandler({
      params: { ...documentParams, name: 'my-custom-automation' },
      ...createDeps([]),
    });

    const yaml = saveAutomationHandlerMock.mock.calls[0][0].params.workflowYaml!;
    expect(yaml).toMatch(/^name: "my-custom-automation"/m);
  });

  it('finds an existing automation by name and replaces it', async () => {
    getWorkflow.mockResolvedValue({
      id: 'wf-named',
      name: 'flight-activity-docs',
      tags: [],
    });

    const result = await installAutomationTemplateHandler({
      params: documentParams,
      ...createDeps([{ type: 'workflow', value: 'wf-named' }]),
    });

    expect(result.replaced).toBe(true);
    expect(saveAutomationHandlerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ workflowId: 'wf-named' }),
      })
    );
  });

  it('creates a new automation when no workflow with the given name exists', async () => {
    getWorkflow.mockResolvedValue({ id: 'wf-other', name: 'other-automation', tags: [] });

    const result = await installAutomationTemplateHandler({
      params: documentParams,
      ...createDeps([{ type: 'workflow', value: 'wf-other' }]),
    });

    expect(result.replaced).toBe(false);
    expect(saveAutomationHandlerMock.mock.calls[0][0].params).not.toHaveProperty('workflowId');
  });

  it('checks write access before reading attached workflows', async () => {
    jest.mocked(assertContextEngineWriteAccess).mockRejectedValueOnce(new Error('no write'));

    await expect(
      installAutomationTemplateHandler({
        params: documentParams,
        ...createDeps([{ type: 'workflow', value: 'wf-existing' }]),
      })
    ).rejects.toThrow('no write');

    expect(getWorkflow).not.toHaveBeenCalled();
    expect(saveAutomationHandlerMock).not.toHaveBeenCalled();
  });

  it('tells the agent to attach the AI index rather than pass an id', async () => {
    const deps = createDeps([]);
    deps.attachments = { getAll: () => [] } as never;

    await expect(
      installAutomationTemplateHandler({
        params: documentParams,
        ...deps,
      })
    ).rejects.toThrow(/does not take an aiIndexId/);

    expect(saveAutomationHandlerMock).not.toHaveBeenCalled();
  });
});
