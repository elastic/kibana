/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import { buildStarterWorkflowYaml } from '../utils/starter_workflow_yaml';
import { useAutomationsEditor } from './use_automations_editor';

const mockSaveAutomations = jest.fn();
const mockCreateWorkflow = jest.fn();
let mockIsSaving = false;
let mockIsCreating = false;

jest.mock('./use_save_ai_index_automations', () => ({
  useSaveAiIndexAutomations: () => ({
    saveAutomations: mockSaveAutomations,
    isSaving: mockIsSaving,
  }),
}));

jest.mock('./use_create_workflow', () => ({
  useCreateWorkflow: () => ({
    createWorkflow: mockCreateWorkflow,
    isCreating: mockIsCreating,
  }),
}));

const aiIndex: GetAiIndexResponse = {
  id: 'my-ai-index',
  managed: false,
  dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
  automations: [{ type: 'workflow', value: 'wf-saved' }],
  sources: [{ type: 'esql', value: 'FROM logs-*' }],
  traces: [],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

const renderEditor = (
  { index }: { index: GetAiIndexResponse | undefined } = { index: aiIndex }
) => {
  const onSaved = jest.fn();
  const view = renderHook(
    ({ aiIndex: current }) => useAutomationsEditor({ aiIndex: current, onSaved }),
    {
      initialProps: { aiIndex: index },
    }
  );
  return { ...view, onSaved };
};

describe('useAutomationsEditor', () => {
  beforeEach(() => {
    mockIsSaving = false;
    mockIsCreating = false;
    mockSaveAutomations.mockResolvedValue(true);
    mockCreateWorkflow.mockResolvedValue('wf-created');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('exposes the persisted automations', () => {
    const { result } = renderEditor();

    expect(result.current.automations).toEqual([{ type: 'workflow', value: 'wf-saved' }]);
    expect(result.current.workflowIds).toEqual(['wf-saved']);
  });

  it('exposes an empty list when the AI index has not loaded yet', () => {
    const { result } = renderEditor({ index: undefined });

    expect(result.current.automations).toEqual([]);
    expect(result.current.workflowIds).toEqual([]);
  });

  it('reflects newly persisted automations', () => {
    const { result, rerender } = renderEditor();

    rerender({ aiIndex: { ...aiIndex, automations: [{ type: 'workflow', value: 'wf-other' }] } });

    expect(result.current.workflowIds).toEqual(['wf-other']);
  });

  it('deletes an automation and notifies on save', async () => {
    const { result, onSaved } = renderEditor();

    let deleted: boolean | undefined;
    await act(async () => {
      deleted = await result.current.deleteAutomation('wf-saved');
    });

    expect(deleted).toBe(true);
    expect(mockSaveAutomations).toHaveBeenCalledWith(aiIndex, []);
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('does not notify when deleting fails to save', async () => {
    mockSaveAutomations.mockResolvedValueOnce(false);
    const { result, onSaved } = renderEditor();

    let deleted: boolean | undefined;
    await act(async () => {
      deleted = await result.current.deleteAutomation('wf-saved');
    });

    expect(deleted).toBe(false);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('does not delete when the AI index has not loaded yet', async () => {
    const { result } = renderEditor({ index: undefined });

    let deleted: boolean | undefined;
    await act(async () => {
      deleted = await result.current.deleteAutomation('wf-saved');
    });

    expect(deleted).toBe(false);
    expect(mockSaveAutomations).not.toHaveBeenCalled();
  });

  it('creates a workflow, attaches it, and resolves with its id', async () => {
    const { result, onSaved } = renderEditor();

    let created: string | undefined;
    await act(async () => {
      created = await result.current.createAndAttach();
    });

    expect(mockCreateWorkflow).toHaveBeenCalledWith(buildStarterWorkflowYaml(aiIndex.id));
    expect(mockSaveAutomations).toHaveBeenCalledWith(aiIndex, [
      { type: 'workflow', value: 'wf-saved' },
      { type: 'workflow', value: 'wf-created' },
    ]);
    expect(created).toBe('wf-created');
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('does not persist anything when creating the workflow fails', async () => {
    mockCreateWorkflow.mockResolvedValueOnce(undefined);
    const { result } = renderEditor();

    let created: string | undefined;
    await act(async () => {
      created = await result.current.createAndAttach();
    });

    expect(created).toBeUndefined();
    expect(mockSaveAutomations).not.toHaveBeenCalled();
  });

  it('resolves undefined when the created workflow cannot be persisted', async () => {
    mockSaveAutomations.mockResolvedValueOnce(false);
    const { result } = renderEditor();

    let created: string | undefined;
    await act(async () => {
      created = await result.current.createAndAttach();
    });

    expect(created).toBeUndefined();
  });

  it('does not create a workflow when the AI index has not loaded yet', async () => {
    const { result } = renderEditor({ index: undefined });

    let created: string | undefined;
    await act(async () => {
      created = await result.current.createAndAttach();
    });

    expect(created).toBeUndefined();
    expect(mockCreateWorkflow).not.toHaveBeenCalled();
  });

  it('reports busy while saving or creating', () => {
    mockIsSaving = true;
    const saving = renderEditor();
    expect(saving.result.current.isBusy).toBe(true);

    mockIsSaving = false;
    mockIsCreating = true;
    const creating = renderEditor();
    expect(creating.result.current.isBusy).toBe(true);
  });
});
