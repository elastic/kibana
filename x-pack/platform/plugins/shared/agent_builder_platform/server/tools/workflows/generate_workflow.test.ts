/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateWorkflow } from '@kbn/agent-builder-workflow-gen';
import { ToolResultType } from '@kbn/agent-builder-common';
import { generateWorkflowTool } from './generate_workflow';

jest.mock('@kbn/agent-builder-workflow-gen', () => ({
  generateWorkflow: jest.fn(),
}));

const generateWorkflowMock = generateWorkflow as jest.MockedFunction<typeof generateWorkflow>;

describe('generateWorkflowTool', () => {
  const workflowsManagement = {
    management: { __mock: 'workflowsApi' },
  } as any;

  const baseContext = {
    modelProvider: { getDefaultModel: jest.fn().mockResolvedValue({ id: 'model' }) },
    logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    request: { __mock: 'request' },
    spaceId: 'default',
  } as any;

  beforeEach(() => {
    generateWorkflowMock.mockReset();
  });

  it('returns the workflow as an otherResult on success', async () => {
    const workflow = {
      version: '1',
      name: 'foo',
      triggers: [{ type: 'manual' }],
      steps: [{ name: 's1', type: 'console', with: { message: 'hi' } }],
    };
    generateWorkflowMock.mockResolvedValueOnce({ workflow } as any);

    const tool = generateWorkflowTool({ workflowsManagement });
    const out = await tool.handler(
      { query: 'a workflow', context: 'ctx', instructions: 'inst' } as any,
      baseContext
    );

    expect(generateWorkflowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        nlQuery: 'a workflow',
        additionalContext: 'ctx',
        additionalInstructions: 'inst',
        spaceId: 'default',
        workflowsApi: workflowsManagement.management,
      })
    );

    expect((out as { results: unknown[] }).results).toEqual([
      { type: ToolResultType.other, data: { workflow } },
    ]);
  });

  it('returns an errorResult when generateWorkflow throws', async () => {
    generateWorkflowMock.mockRejectedValueOnce(new Error('boom'));

    const tool = generateWorkflowTool({ workflowsManagement });
    const out = await tool.handler({ query: 'q' } as any, baseContext);

    expect((out as { results: unknown[] }).results).toEqual([
      { type: ToolResultType.error, data: { message: 'boom' } },
    ]);
  });
});
