/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities, KibanaRequest } from '@kbn/core/server';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { AiIndexHttpItem } from '../../../common/http_api/ai_indices';
import type { WorkflowsManagementApiLike } from '../../types';
import { getAiIndexAutomationsTool } from './get_ai_index_automations';

const aiIndex: AiIndexHttpItem = {
  id: 'my-ai-index',
  managed: false,
  dest: { type: 'data_stream', value: 'ds' },
  automations: [
    { type: 'workflow', value: 'wf-1' },
    { type: 'workflow', value: 'wf-2' },
  ],
  sources: [],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

const request = {} as KibanaRequest;
const handlerContext = { request, spaceId: 'default' } as Parameters<
  ReturnType<typeof getAiIndexAutomationsTool>['handler']
>[1];

interface ToolResultsReturn {
  results: Array<{ type: ToolResultType; data: unknown }>;
}

const runHandler = async (
  tool: ReturnType<typeof getAiIndexAutomationsTool>
): Promise<ToolResultsReturn> => {
  const result = await tool.handler({}, handlerContext);
  if (!('results' in result)) {
    throw new Error('Expected the tool to return `results`.');
  }
  return result as ToolResultsReturn;
};

const capabilitiesWithRead = {
  workflowsManagement: { readWorkflow: true },
} as unknown as Capabilities;
const capabilitiesWithoutRead = {
  workflowsManagement: { readWorkflow: false },
} as unknown as Capabilities;

describe('getAiIndexAutomationsTool', () => {
  it('throws when the caller lacks the Workflows Management read privilege (no internal-user bypass)', async () => {
    const getWorkflow = jest.fn();
    const tool = getAiIndexAutomationsTool({
      aiIndex,
      getWorkflowsApi: () => ({ getWorkflow } as unknown as WorkflowsManagementApiLike),
      getCapabilities: async () => capabilitiesWithoutRead,
    });

    await expect(tool.handler({}, handlerContext)).rejects.toThrow(/Unauthorized/);
    // Privilege is enforced BEFORE any workflow is read.
    expect(getWorkflow).not.toHaveBeenCalled();
  });

  it('reads each linked workflow’s YAML when the caller has the read privilege', async () => {
    const getWorkflow = jest.fn(async (id: string) => ({ yaml: `yaml-for-${id}` }));
    const tool = getAiIndexAutomationsTool({
      aiIndex,
      getWorkflowsApi: () => ({ getWorkflow } as unknown as WorkflowsManagementApiLike),
      getCapabilities: async () => capabilitiesWithRead,
    });

    const result = await runHandler(tool);

    expect(getWorkflow).toHaveBeenCalledWith('wf-1', 'default');
    expect(getWorkflow).toHaveBeenCalledWith('wf-2', 'default');
    expect(result.results[0].type).toBe(ToolResultType.other);
    expect(result.results[0].data).toEqual({
      ai_index_id: 'my-ai-index',
      automations: [
        { workflow_id: 'wf-1', yaml: 'yaml-for-wf-1' },
        { workflow_id: 'wf-2', yaml: 'yaml-for-wf-2' },
      ],
    });
  });

  it('reports a per-workflow error rather than failing when the workflows API is unavailable', async () => {
    const tool = getAiIndexAutomationsTool({
      aiIndex,
      getWorkflowsApi: () => undefined,
      getCapabilities: async () => capabilitiesWithRead,
    });

    const result = await runHandler(tool);

    expect(result.results[0].data).toEqual({
      ai_index_id: 'my-ai-index',
      automations: [
        { workflow_id: 'wf-1', error: expect.any(String) },
        { workflow_id: 'wf-2', error: expect.any(String) },
      ],
    });
  });

  it('reports "Workflow not found." for a linked workflow the API cannot resolve', async () => {
    const getWorkflow = jest.fn(async (id: string) => (id === 'wf-1' ? { yaml: 'yaml-1' } : null));
    const tool = getAiIndexAutomationsTool({
      aiIndex,
      getWorkflowsApi: () => ({ getWorkflow } as unknown as WorkflowsManagementApiLike),
      getCapabilities: async () => capabilitiesWithRead,
    });

    const result = await runHandler(tool);

    expect(result.results[0].data).toEqual({
      ai_index_id: 'my-ai-index',
      automations: [
        { workflow_id: 'wf-1', yaml: 'yaml-1' },
        { workflow_id: 'wf-2', error: 'Workflow not found.' },
      ],
    });
  });

  it('isolates a thrown read into a per-workflow error without failing the whole tool', async () => {
    const getWorkflow = jest.fn(async (id: string) => {
      if (id === 'wf-2') {
        throw new Error('boom');
      }
      return { yaml: 'yaml-1' };
    });
    const tool = getAiIndexAutomationsTool({
      aiIndex,
      getWorkflowsApi: () => ({ getWorkflow } as unknown as WorkflowsManagementApiLike),
      getCapabilities: async () => capabilitiesWithRead,
    });

    const result = await runHandler(tool);

    expect(result.results[0].data).toEqual({
      ai_index_id: 'my-ai-index',
      automations: [
        { workflow_id: 'wf-1', yaml: 'yaml-1' },
        { workflow_id: 'wf-2', error: 'boom' },
      ],
    });
  });
});
