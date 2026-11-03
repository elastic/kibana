/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import { useSourcesEditor } from './use_sources_editor';

const mockSaveSources = jest.fn();
let mockIsSaving = false;

jest.mock('./use_save_ai_index_sources', () => ({
  useSaveAiIndexSources: () => ({
    saveSources: mockSaveSources,
    isSaving: mockIsSaving,
  }),
}));

const aiIndex: GetAiIndexResponse = {
  id: 'my-ai-index',
  managed: false,
  memory_enabled: false,
  dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
  automations: [],
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
    ({ aiIndex: current }) => useSourcesEditor({ aiIndex: current, onSaved }),
    {
      initialProps: { aiIndex: index },
    }
  );
  return { ...view, onSaved };
};

describe('useSourcesEditor', () => {
  beforeEach(() => {
    mockIsSaving = false;
    mockSaveSources.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns idle controls while there is no AI index', () => {
    const { result } = renderEditor({ index: undefined });

    expect(result.current.selectedSources).toEqual([]);
    expect(result.current.hasChanges).toBe(false);
    expect(result.current.isSaving).toBe(false);
    expect(mockSaveSources).not.toHaveBeenCalled();
  });

  it('seeds the draft from persisted sources as soon as the AI index loads', () => {
    const { result } = renderEditor();

    expect(result.current.selectedSources).toEqual([
      { type: 'esql', id: 'FROM logs-*', label: 'FROM logs-*', value: 'FROM logs-*' },
    ]);
    expect(result.current.hasChanges).toBe(false);
  });

  it('persists changes on save and keeps the draft with the saved selection', async () => {
    const { result, onSaved } = renderEditor();

    act(() =>
      result.current.setSelectedSources([
        { type: 'esql', id: 'FROM other', label: 'FROM other', value: 'FROM other' },
      ])
    );

    await act(async () => {
      await result.current.save();
    });

    expect(mockSaveSources).toHaveBeenCalledWith(aiIndex, [
      { type: 'esql', id: 'FROM other', label: 'FROM other', value: 'FROM other' },
    ]);
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(result.current.selectedSources).toEqual([
      { type: 'esql', id: 'FROM other', label: 'FROM other', value: 'FROM other' },
    ]);
    expect(result.current.hasChanges).toBe(false);
  });

  it('reverts unsaved changes on cancel', () => {
    const { result } = renderEditor();

    act(() =>
      result.current.setSelectedSources([
        { type: 'esql', id: 'FROM other', label: 'FROM other', value: 'FROM other' },
      ])
    );
    expect(result.current.hasChanges).toBe(true);

    act(() => result.current.cancel());

    expect(result.current.selectedSources).toEqual([
      { type: 'esql', id: 'FROM logs-*', label: 'FROM logs-*', value: 'FROM logs-*' },
    ]);
    expect(result.current.hasChanges).toBe(false);
  });

  it('reseeds the draft from scratch when the AI index id changes', () => {
    const { result, rerender } = renderEditor();

    act(() =>
      result.current.setSelectedSources([
        { type: 'esql', id: 'FROM other', label: 'FROM other', value: 'FROM other' },
      ])
    );

    rerender({
      aiIndex: {
        ...aiIndex,
        id: 'another-ai-index',
        sources: [{ type: 'esql', value: 'FROM another' }],
      },
    });

    expect(result.current.selectedSources).toEqual([
      { type: 'esql', id: 'FROM another', label: 'FROM another', value: 'FROM another' },
    ]);
    expect(result.current.hasChanges).toBe(false);
  });

  it('resyncs a pristine draft when a background refetch changes the persisted sources', () => {
    const { result, rerender } = renderEditor();

    rerender({
      aiIndex: { ...aiIndex, sources: [{ type: 'esql', value: 'FROM elsewhere' }] },
    });

    expect(result.current.selectedSources).toEqual([
      { type: 'esql', id: 'FROM elsewhere', label: 'FROM elsewhere', value: 'FROM elsewhere' },
    ]);
    expect(result.current.hasChanges).toBe(false);
  });

  it('keeps unsaved edits when a background refetch changes the persisted sources', () => {
    const { result, rerender } = renderEditor();

    act(() =>
      result.current.setSelectedSources([
        { type: 'esql', id: 'FROM mine', label: 'FROM mine', value: 'FROM mine' },
      ])
    );

    rerender({
      aiIndex: { ...aiIndex, sources: [{ type: 'esql', value: 'FROM elsewhere' }] },
    });

    expect(result.current.selectedSources).toEqual([
      { type: 'esql', id: 'FROM mine', label: 'FROM mine', value: 'FROM mine' },
    ]);
    expect(result.current.hasChanges).toBe(true);
  });

  it('does not reseed from a stale refetch received while editing after save succeeds', async () => {
    const { result, rerender } = renderEditor();

    act(() =>
      result.current.setSelectedSources([
        { type: 'esql', id: 'FROM mine', label: 'FROM mine', value: 'FROM mine' },
      ])
    );

    rerender({
      aiIndex: { ...aiIndex, sources: [{ type: 'esql', value: 'FROM elsewhere' }] },
    });

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.selectedSources).toEqual([
      { type: 'esql', id: 'FROM mine', label: 'FROM mine', value: 'FROM mine' },
    ]);
    expect(result.current.hasChanges).toBe(false);
  });

  it('does not revert to stale sources on the re-render right after a successful save', async () => {
    const { result } = renderEditor();

    act(() =>
      result.current.setSelectedSources([
        { type: 'esql', id: 'FROM other', label: 'FROM other', value: 'FROM other' },
      ])
    );

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.selectedSources).toEqual([
      { type: 'esql', id: 'FROM other', label: 'FROM other', value: 'FROM other' },
    ]);
    expect(result.current.hasChanges).toBe(false);
  });

  it('does not clear a newer draft when a stale save resolves', async () => {
    let resolveSave: (value: boolean) => void = () => {};
    mockSaveSources.mockReturnValueOnce(
      new Promise<boolean>((resolve) => {
        resolveSave = resolve;
      })
    );

    const { result, rerender } = renderEditor();

    act(() =>
      result.current.setSelectedSources([
        { type: 'esql', id: 'FROM stale', label: 'FROM stale', value: 'FROM stale' },
      ])
    );

    let savePromise: Promise<void> | undefined;
    act(() => {
      savePromise = result.current.save();
    });

    rerender({
      aiIndex: {
        ...aiIndex,
        id: 'another-ai-index',
        sources: [{ type: 'esql', value: 'FROM newer' }],
      },
    });
    const newerSelected = result.current.selectedSources;

    resolveSave(true);
    await act(async () => {
      await savePromise;
    });

    expect(result.current.selectedSources).toEqual(newerSelected);
  });

  it('keeps draft changes while a save is in progress', () => {
    mockIsSaving = true;
    const { result } = renderEditor();

    act(() =>
      result.current.setSelectedSources([
        {
          type: 'esql',
          id: 'FROM during-save',
          label: 'FROM during-save',
          value: 'FROM during-save',
        },
      ])
    );

    expect(result.current.selectedSources).toEqual([
      {
        type: 'esql',
        id: 'FROM during-save',
        label: 'FROM during-save',
        value: 'FROM during-save',
      },
    ]);
  });
});
