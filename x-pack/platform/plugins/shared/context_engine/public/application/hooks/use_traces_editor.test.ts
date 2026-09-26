/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import { useTracesEditor } from './use_traces_editor';

const mockSaveTraces = jest.fn();
let mockIsSaving = false;

jest.mock('./use_save_ai_index_traces', () => ({
  useSaveAiIndexTraces: () => ({
    saveTraces: mockSaveTraces,
    isSaving: mockIsSaving,
  }),
}));

const aiIndex: GetAiIndexResponse = {
  id: 'my-ai-index',
  managed: false,
  memory_enabled: true,
  dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
  automations: [],
  sources: [],
  traces: [{ type: 'elastic_agent', value: 'agent-1', query: 'FROM traces' }],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

const renderEditor = (
  { index }: { index: GetAiIndexResponse | undefined } = { index: aiIndex }
) => {
  const onSaved = jest.fn();
  const view = renderHook(
    ({ aiIndex: current }) => useTracesEditor({ aiIndex: current, onSaved }),
    {
      initialProps: { aiIndex: index },
    }
  );
  return { ...view, onSaved };
};

describe('useTracesEditor', () => {
  beforeEach(() => {
    mockIsSaving = false;
    mockSaveTraces.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('starts idle and exposes the persisted trace', () => {
    const { result } = renderEditor();

    expect(result.current.editing).toBeUndefined();
    expect(result.current.currentTrace).toEqual({ type: 'elastic_agent', value: 'agent-1' });
  });

  it('exposes no current trace when the AI index has not loaded yet', () => {
    const { result } = renderEditor({ index: undefined });

    expect(result.current.currentTrace).toBeUndefined();
  });

  it('treats esql traces as empty in read-only mode', () => {
    const { result } = renderEditor({
      index: {
        ...aiIndex,
        traces: [{ type: 'esql', value: 'FROM traces', query: 'FROM traces' }],
      },
    });

    expect(result.current.currentTrace).toBeUndefined();
  });

  it('seeds the draft from the persisted trace when editing starts', () => {
    const { result } = renderEditor();

    act(() => result.current.startEditing());

    expect(result.current.editing?.draft).toEqual({ type: 'elastic_agent', value: 'agent-1' });
  });

  it('seeds an empty draft when no editable trace is configured', () => {
    const { result } = renderEditor({ index: { ...aiIndex, traces: [] } });

    act(() => result.current.startEditing());

    expect(result.current.editing?.draft).toBeUndefined();
  });

  it('updates the draft while editing', () => {
    const { result } = renderEditor();

    act(() => result.current.startEditing());
    act(() => result.current.editing?.setDraft({ type: 'index', value: 'logs-genai-default' }));

    expect(result.current.editing?.draft).toEqual({ type: 'index', value: 'logs-genai-default' });
  });

  it('discards the draft when editing is cancelled', () => {
    const { result } = renderEditor();

    act(() => result.current.startEditing());
    act(() => result.current.editing?.setDraft({ type: 'index', value: 'logs-genai-default' }));
    act(() => result.current.editing?.cancel());

    expect(result.current.editing).toBeUndefined();
    expect(result.current.currentTrace).toEqual({ type: 'elastic_agent', value: 'agent-1' });
    expect(mockSaveTraces).not.toHaveBeenCalled();
  });

  it('does not reuse a discarded draft when editing starts again', () => {
    const { result } = renderEditor();

    act(() => result.current.startEditing());
    act(() => result.current.editing?.setDraft({ type: 'index', value: 'logs-genai-default' }));
    act(() => result.current.editing?.cancel());
    act(() => result.current.startEditing());

    expect(result.current.editing?.draft).toEqual({ type: 'elastic_agent', value: 'agent-1' });
  });

  it('persists the draft, leaves edit mode, and notifies on save', async () => {
    const { result, onSaved } = renderEditor();

    act(() => result.current.startEditing());
    act(() => result.current.editing?.setDraft({ type: 'index', value: 'logs-genai-default' }));
    await act(async () => {
      await result.current.editing?.save();
    });

    expect(mockSaveTraces).toHaveBeenCalledWith(aiIndex, {
      type: 'index',
      value: 'logs-genai-default',
    });
    expect(result.current.editing).toBeUndefined();
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('keeps editing when save fails', async () => {
    mockSaveTraces.mockResolvedValue(false);
    const { result, onSaved } = renderEditor();

    act(() => result.current.startEditing());
    act(() => result.current.editing?.setDraft({ type: 'index', value: 'logs-genai-default' }));
    await act(async () => {
      await result.current.editing?.save();
    });

    expect(result.current.editing?.draft).toEqual({ type: 'index', value: 'logs-genai-default' });
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('reflects newly persisted traces while idle', () => {
    const { result, rerender } = renderEditor();

    rerender({
      aiIndex: {
        ...aiIndex,
        traces: [{ type: 'index', value: 'logs-genai-default', query: 'FROM logs' }],
      },
    });

    expect(result.current.currentTrace).toEqual({
      type: 'index',
      value: 'logs-genai-default',
    });
  });
});
