/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { AI_INDEX_ATTACHMENT_TYPE } from '../../../../common/agent_builder_attachments';
import { installAutomationTemplate } from '../../../automation_templates/install_automation_template';
import { syncAttachmentsToSavedWorkflow } from '../save_automation/handler';
import { installAutomationTemplateHandler } from './handler';
import { AUTOMATION_TEMPLATE_TAGS } from './render';

jest.mock('../../../automation_templates/install_automation_template', () => {
  const actual = jest.requireActual('../../../automation_templates/install_automation_template');
  return {
    ...actual,
    installAutomationTemplate: jest.fn().mockResolvedValue({
      aiIndexId: 'airline-loyalty',
      workflowId: 'wf-saved',
      status: 'saved_and_attached',
      replaced: false,
    }),
  };
});

jest.mock('../save_automation/handler', () => {
  const actual = jest.requireActual('../save_automation/handler');
  return { ...actual, syncAttachmentsToSavedWorkflow: jest.fn().mockResolvedValue(undefined) };
});

const installMock = installAutomationTemplate as jest.MockedFunction<
  typeof installAutomationTemplate
>;
const syncMock = syncAttachmentsToSavedWorkflow as jest.MockedFunction<
  typeof syncAttachmentsToSavedWorkflow
>;

describe('installAutomationTemplateHandler', () => {
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

  const createDeps = (attachments: Array<Record<string, unknown>>) => ({
    request: httpServerMock.createKibanaRequest(),
    spaceId: 'default',
    attachments: { getAll: () => attachments } as never,
    logger: loggingSystemMock.createLogger(),
    getAiIndexService: async () => ({} as never),
    getCoreStart: async () => ({} as never),
    getSecurityStart: async () => undefined,
    getWorkflowsManagement: () => ({} as never),
  });

  const aiIndexAttachment = {
    id: 'ai-index-attachment',
    type: AI_INDEX_ATTACHMENT_TYPE,
    current_version: 1,
    versions: [{ version: 1, data: { id: 'airline-loyalty' } }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('installs on the AI index attached to the conversation', async () => {
    const result = await installAutomationTemplateHandler({
      params: documentParams,
      ...createDeps([aiIndexAttachment]),
    });

    expect(result.workflowId).toBe('wf-saved');
    expect(installMock).toHaveBeenCalledWith(
      expect.objectContaining({ aiIndexId: 'airline-loyalty', params: documentParams })
    );
  });

  it('points the conversation at the saved workflow, with the YAML that was installed', async () => {
    await installAutomationTemplateHandler({
      params: documentParams,
      ...createDeps([aiIndexAttachment]),
    });

    expect(syncMock).toHaveBeenCalledWith(expect.objectContaining({ workflowId: 'wf-saved' }));
    const { yaml } = syncMock.mock.calls[0][0].source;
    expect(yaml).toContain(AUTOMATION_TEMPLATE_TAGS.document_orchestration);
    expect(yaml).toMatch(/^name: "flight-activity-docs"/m);
  });

  it('tells the agent to attach the AI index rather than pass an id', async () => {
    await expect(
      installAutomationTemplateHandler({ params: documentParams, ...createDeps([]) })
    ).rejects.toThrow(/does not take an aiIndexId/);

    expect(installMock).not.toHaveBeenCalled();
  });
});
