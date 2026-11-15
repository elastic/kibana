/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { AiIndexService } from '@kbn/context-engine-plugin/server/ai_indices/service';
import { saveWorkflowToAiIndex } from '../agent_builder/tools/save_automation/handler';
import { assertContextEngineWriteAccess } from '../agent_builder/assert_context_engine_write_access';
import { AUTOMATION_TEMPLATE_TAGS } from '../agent_builder/tools/install_automation_template/render';
import { InvalidTemplateParamsError } from '../errors';
import {
  installAutomationTemplate,
  renderAutomationTemplate,
  type InstallAutomationTemplateParams,
} from './install_automation_template';

jest.mock('../agent_builder/assert_context_engine_write_access', () => ({
  assertContextEngineWriteAccess: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../agent_builder/tools/save_automation/handler', () => {
  const actual = jest.requireActual('../agent_builder/tools/save_automation/handler');
  return {
    ...actual,
    saveWorkflowToAiIndex: jest.fn().mockResolvedValue({
      aiIndexId: 'airline-loyalty',
      workflowId: 'wf-saved',
      status: 'saved_and_attached',
    }),
  };
});

const saveMock = saveWorkflowToAiIndex as jest.MockedFunction<typeof saveWorkflowToAiIndex>;
const savedYaml = (): string => saveMock.mock.calls[0][0].workflowYaml;
const savedOverwrite = (): string | undefined => saveMock.mock.calls[0][0].existingWorkflowId;

describe('installAutomationTemplate', () => {
  const getWorkflow = jest.fn();

  const install = (
    params: InstallAutomationTemplateParams,
    automations: Array<{ type: 'workflow'; value: string }> = []
  ) =>
    installAutomationTemplate({
      aiIndexId: 'airline-loyalty',
      params,
      request: httpServerMock.createKibanaRequest(),
      spaceId: 'default',
      logger: loggingSystemMock.createLogger(),
      getAiIndexService: async () =>
        ({ get: async () => ({ automations }) } as unknown as AiIndexService),
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

  const unitParams = {
    template: 'unit_profile' as const,
    name: 'loyalty-province-profile',
    unitIndex: 'loyalty-history',
    unitKey: 'Province',
    activityField: 'Enrollment Date',
    breakdownField: 'Loyalty Card',
    corpusFilter: '',
    metricFields: [],
    maxUnits: 25,
  };

  const indexMetadataParams = {
    template: 'index_metadata' as const,
    name: 'loyalty-index-metadata',
    sources: [
      { index: 'loyalty-docs', categoryField: 'tier' },
      { index: 'flight-activity', categoryField: 'Loyalty Card' },
    ],
  };

  const kisYaml = `- ki_id: constraint-foo\n  ki:\n    type: constraint\n    title: "Foo constraint"\n    description: "desc"\n    content: "content"\n    tags:\n      - constraint\n    references:\n      - uri: index://foo\n        relation: derived_from`;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('saves a new workflow on the given AI index when the template is not attached', async () => {
    const result = await install(documentParams);

    expect(result).toEqual({
      aiIndexId: 'airline-loyalty',
      workflowId: 'wf-saved',
      status: 'saved_and_attached',
      replaced: false,
    });
    expect(saveMock).toHaveBeenCalledWith(
      expect.objectContaining({ aiIndexId: 'airline-loyalty' })
    );
    expect(savedOverwrite()).toBeUndefined();
    expect(savedYaml()).toContain(AUTOMATION_TEMPLATE_TAGS.document_orchestration);
  });

  it('does not overwrite a tagged workflow whose name differs from the requested name', async () => {
    getWorkflow.mockResolvedValue({
      id: 'wf-existing',
      name: 'different-automation-name',
      tags: [AUTOMATION_TEMPLATE_TAGS.document_orchestration],
    });

    const result = await install(documentParams, [{ type: 'workflow', value: 'wf-existing' }]);

    expect(result.replaced).toBe(false);
    expect(savedOverwrite()).toBeUndefined();
  });

  it('overwrites an existing workflow whose name matches the requested name', async () => {
    getWorkflow.mockResolvedValue({
      id: 'wf-existing',
      name: 'flight-activity-docs',
      tags: [AUTOMATION_TEMPLATE_TAGS.document_orchestration],
    });

    const result = await install(documentParams, [{ type: 'workflow', value: 'wf-existing' }]);

    expect(result.replaced).toBe(true);
    expect(savedOverwrite()).toBe('wf-existing');
  });

  it('overwrites a workflow saved before the tag existed when the name matches', async () => {
    getWorkflow.mockResolvedValue({ id: 'wf-by-name', name: 'flight-activity-docs', tags: [] });

    await install(documentParams, [{ type: 'workflow', value: 'wf-by-name' }]);

    expect(savedOverwrite()).toBe('wf-by-name');
  });

  it('never overwrites a workflow tagged as another template', async () => {
    getWorkflow.mockResolvedValue({
      id: 'wf-unit',
      name: 'flight-activity-docs',
      tags: [AUTOMATION_TEMPLATE_TAGS.unit_profile],
    });

    const result = await install(documentParams, [{ type: 'workflow', value: 'wf-unit' }]);

    expect(result.replaced).toBe(false);
    expect(savedOverwrite()).toBeUndefined();
  });

  it('renders index metadata with every source', async () => {
    await install(indexMetadataParams);

    expect(savedYaml()).toContain(AUTOMATION_TEMPLATE_TAGS.index_metadata);
    expect(savedYaml()).toContain('"index":"loyalty-docs"');
    expect(savedYaml()).toContain('"index":"flight-activity"');
  });

  it('renders the unit profile', async () => {
    await install(unitParams);

    expect(savedYaml()).toContain(AUTOMATION_TEMPLATE_TAGS.unit_profile);
    expect(savedYaml()).toContain('unit_key: "Province"');
  });

  it('renders the targeted KI writer with the given kis', async () => {
    await install({ template: 'targeted_ki_writer', name: 'loyalty-constraints', kis: kisYaml });

    expect(savedYaml()).toContain(AUTOMATION_TEMPLATE_TAGS.targeted_ki_writer);
    expect(savedYaml()).toContain('ki_id: constraint-foo');
  });

  it.each([
    ['index metadata', indexMetadataParams, AUTOMATION_TEMPLATE_TAGS.index_metadata],
    ['unit profile', unitParams, AUTOMATION_TEMPLATE_TAGS.unit_profile],
    [
      'targeted KI writer',
      { template: 'targeted_ki_writer' as const, name: 'loyalty-constraints', kis: kisYaml },
      AUTOMATION_TEMPLATE_TAGS.targeted_ki_writer,
    ],
  ])('overwrites the %s automation when its name matches', async (_name, params, tag) => {
    getWorkflow.mockResolvedValue({ id: 'wf-match', name: params.name, tags: [tag] });

    const result = await install(params, [{ type: 'workflow', value: 'wf-match' }]);

    expect(result.replaced).toBe(true);
    expect(savedOverwrite()).toBe('wf-match');
  });

  it('does not create a second automation when reading an attached workflow fails', async () => {
    getWorkflow.mockRejectedValue(new Error('workflow read failed'));

    await expect(
      install(documentParams, [{ type: 'workflow', value: 'wf-existing' }])
    ).rejects.toThrow('workflow read failed');
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('injects the automation name into the rendered workflow YAML', async () => {
    await install({ ...documentParams, name: 'my-custom-automation' });

    expect(savedYaml()).toMatch(/^name: "my-custom-automation"/m);
  });

  it('checks write access before reading attached workflows', async () => {
    jest.mocked(assertContextEngineWriteAccess).mockRejectedValueOnce(new Error('no write'));

    await expect(
      install(documentParams, [{ type: 'workflow', value: 'wf-existing' }])
    ).rejects.toThrow('no write');
    expect(getWorkflow).not.toHaveBeenCalled();
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('rejects parameters the template cannot render, before saving anything', async () => {
    await expect(install({ ...unitParams, unitKey: 'Province` | DROP x' })).rejects.toThrow(
      InvalidTemplateParamsError
    );
    expect(saveMock).not.toHaveBeenCalled();
  });
});

describe('renderAutomationTemplate', () => {
  it('names the workflow after the automation, quoted', () => {
    expect(
      renderAutomationTemplate(
        { template: 'targeted_ki_writer', name: 'a "quoted" name', kis: '- ki_id: a\n  ki: {}' },
        'idx'
      )
    ).toMatch(/^name: "a \\"quoted\\" name"$/m);
  });
});
