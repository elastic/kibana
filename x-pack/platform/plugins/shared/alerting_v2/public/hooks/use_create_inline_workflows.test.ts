/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useService } from '@kbn/core-di-browser';
import { WorkflowApi } from '@kbn/workflows-ui';
import type { InlineWorkflowActionDraft } from '@kbn/alerting-v2-rule-form';
import { useCreateInlineWorkflows } from './use_create_inline_workflows';

jest.mock('@kbn/core-di-browser');
jest.mock('@kbn/workflows-ui');
jest.mock('@kbn/alerting-v2-rule-form', () => ({
  buildInlineWorkflowYaml: jest.fn().mockReturnValue('workflow: yaml'),
}));

const mockUseService = useService as jest.MockedFunction<typeof useService>;

const draft = (id: string): InlineWorkflowActionDraft => ({
  id,
  source: 'inline',
  stepType: 'slack2.sendMessage',
  connectorId: 'connector-1',
  params: 'message: hi',
});

describe('useCreateInlineWorkflows', () => {
  const mockCreateWorkflow = jest.fn();
  const mockDeleteWorkflow = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseService.mockImplementation((service: unknown) => {
      if (service === WorkflowApi) {
        return {
          createWorkflow: mockCreateWorkflow,
          deleteWorkflow: mockDeleteWorkflow,
        } as ReturnType<typeof useService>;
      }
      return undefined as ReturnType<typeof useService>;
    });
  });

  it('creates a workflow per draft and returns their ids', async () => {
    mockCreateWorkflow.mockResolvedValueOnce({ id: 'wf-1' }).mockResolvedValueOnce({ id: 'wf-2' });

    const { result } = renderHook(() => useCreateInlineWorkflows());

    const ids = await result.current.createInlineWorkflows([draft('a'), draft('b')]);

    expect(mockCreateWorkflow).toHaveBeenCalledTimes(2);
    expect(mockCreateWorkflow).toHaveBeenCalledWith({ yaml: 'workflow: yaml' });
    expect(ids).toEqual(['wf-1', 'wf-2']);
  });

  it('returns an empty array without calling the API for no drafts', async () => {
    const { result } = renderHook(() => useCreateInlineWorkflows());

    const ids = await result.current.createInlineWorkflows([]);

    expect(ids).toEqual([]);
    expect(mockCreateWorkflow).not.toHaveBeenCalled();
  });

  it('rolls back already-created workflows when a later creation fails', async () => {
    mockCreateWorkflow
      .mockResolvedValueOnce({ id: 'wf-1' })
      .mockRejectedValueOnce(new Error('boom'));
    mockDeleteWorkflow.mockResolvedValue(undefined);

    const { result } = renderHook(() => useCreateInlineWorkflows());

    await expect(result.current.createInlineWorkflows([draft('a'), draft('b')])).rejects.toThrow(
      'boom'
    );

    expect(mockDeleteWorkflow).toHaveBeenCalledTimes(1);
    expect(mockDeleteWorkflow).toHaveBeenCalledWith('wf-1');
  });

  it('deletes all provided workflow ids on rollback', async () => {
    mockDeleteWorkflow.mockResolvedValue(undefined);

    const { result } = renderHook(() => useCreateInlineWorkflows());

    await result.current.rollbackWorkflows(['wf-1', 'wf-2']);

    expect(mockDeleteWorkflow).toHaveBeenCalledWith('wf-1');
    expect(mockDeleteWorkflow).toHaveBeenCalledWith('wf-2');
  });
});
