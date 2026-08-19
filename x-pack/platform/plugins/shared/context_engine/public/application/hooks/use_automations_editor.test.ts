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

  it('starts idle and exposes the persisted automations', () => {
    const { result } = renderEditor();

    expect(result.current.isEditing).toBe(false);
    expect(result.current.automations).toEqual([{ type: 'workflow', value: 'wf-saved' }]);
    expect(result.current.workflowIds).toEqual(['wf-saved']);
  });

  it('exposes an empty list when the AI index has not loaded yet', () => {
    const { result } = renderEditor({ index: undefined });

    expect(result.current.automations).toEqual([]);
    expect(result.current.workflowIds).toEqual([]);
  });

  it('reflects newly persisted automations while idle', () => {
    const { result, rerender } = renderEditor();

    rerender({ aiIndex: { ...aiIndex, automations: [{ type: 'workflow', value: 'wf-other' }] } });

    expect(result.current.workflowIds).toEqual(['wf-other']);
  });

  it('seeds the draft from the persisted automations when editing starts', () => {
    const { result } = renderEditor();

    act(() => result.current.startEditing());

    expect(result.current.isEditing).toBe(true);
    expect(result.current.automations).toEqual([{ type: 'workflow', value: 'wf-saved' }]);
  });

  it('ignores remove while idle', () => {
    const { result } = renderEditor();

    act(() => result.current.removeAutomation('wf-saved'));

    expect(result.current.isEditing).toBe(false);
    expect(result.current.workflowIds).toEqual(['wf-saved']);
  });

  it('removes an automation from the draft', () => {
    const { result } = renderEditor();

    act(() => result.current.startEditing());
    act(() => result.current.removeAutomation('wf-saved'));

    expect(result.current.automations).toEqual([]);
  });

  it('discards the draft when editing stops', () => {
    const { result } = renderEditor();

    act(() => result.current.startEditing());
    act(() => result.current.removeAutomation('wf-saved'));
    act(() => result.current.stopEditing());

    expect(result.current.isEditing).toBe(false);
    expect(result.current.workflowIds).toEqual(['wf-saved']);
    expect(mockSaveAutomations).not.toHaveBeenCalled();
  });

  it('does not reuse a discarded draft when editing starts again', () => {
    const { result } = renderEditor();

    act(() => result.current.startEditing());
    act(() => result.current.removeAutomation('wf-saved'));
    act(() => result.current.stopEditing());
    act(() => result.current.startEditing());

    expect(result.current.workflowIds).toEqual(['wf-saved']);
  });

  it('persists the draft, leaves edit mode, and notifies on save', async () => {
    const { result, onSaved } = renderEditor();

    act(() => result.current.startEditing());
    act(() => result.current.removeAutomation('wf-saved'));
    await act(async () => {
      await result.current.save();
    });

    expect(mockSaveAutomations).toHaveBeenCalledWith(aiIndex, []);
    expect(result.current.isEditing).toBe(false);
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('stays in edit mode and keeps the draft when saving fails', async () => {
    mockSaveAutomations.mockResolvedValueOnce(false);
    const { result, onSaved } = renderEditor();

    act(() => result.current.startEditing());
    act(() => result.current.removeAutomation('wf-saved'));
    await act(async () => {
      await result.current.save();
    });

    expect(result.current.isEditing).toBe(true);
    expect(result.current.workflowIds).toEqual([]);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('does not save while idle', async () => {
    const { result } = renderEditor();

    await act(async () => {
      await result.current.save();
    });

    expect(mockSaveAutomations).not.toHaveBeenCalled();
  });

  it('creates a workflow while idle, attaches it, and resolves with its id', async () => {
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
    expect(result.current.isEditing).toBe(false);
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('creates a workflow while editing, attaches it, and resolves with its id', async () => {
    const { result, onSaved } = renderEditor();

    act(() => result.current.startEditing());
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
    expect(result.current.isEditing).toBe(false);
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('does not persist anything when creating the workflow fails', async () => {
    mockCreateWorkflow.mockResolvedValueOnce(undefined);
    const { result } = renderEditor();

    act(() => result.current.startEditing());
    let created: string | undefined;
    await act(async () => {
      created = await result.current.createAndAttach();
    });

    expect(created).toBeUndefined();
    expect(mockSaveAutomations).not.toHaveBeenCalled();
    expect(result.current.isEditing).toBe(true);
  });

  it('resolves undefined when the created workflow cannot be persisted', async () => {
    mockSaveAutomations.mockResolvedValueOnce(false);
    const { result } = renderEditor();

    act(() => result.current.startEditing());
    let created: string | undefined;
    await act(async () => {
      created = await result.current.createAndAttach();
    });

    expect(created).toBeUndefined();
    expect(result.current.isEditing).toBe(true);
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
