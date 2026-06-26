/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { monaco } from '@kbn/code-editor';
import {
  useLineDifferencesDecorations,
  computeChangedLines,
} from './use_line_differences_decorations';

jest.mock('@kbn/code-editor', () => ({
  monaco: {
    Range: jest.fn((startLine, startCol, endLine, endCol) => ({
      startLineNumber: startLine,
      startColumn: startCol,
      endLineNumber: endLine,
      endColumn: endCol,
    })),
  },
}));

const createMockEditor = () => {
  const clearFn = jest.fn();
  const createDecorationsCollectionFn = jest.fn().mockReturnValue({ clear: clearFn });
  const getLineMaxColumnFn = jest.fn().mockReturnValue(80);

  return {
    editor: {
      getModel: jest.fn().mockReturnValue({
        getLineMaxColumn: getLineMaxColumnFn,
      }),
      createDecorationsCollection: createDecorationsCollectionFn,
    } as unknown as monaco.editor.IStandaloneCodeEditor,
    createDecorationsCollectionFn,
    clearFn,
  };
};

describe('computeChangedLines', () => {
  it('returns empty array when values are identical', () => {
    expect(computeChangedLines('a\nb\nc', 'a\nb\nc')).toEqual([]);
  });

  it('detects a modified line', () => {
    expect(computeChangedLines('a\nb\nc', 'a\nX\nc')).toEqual([2]);
  });

  it('detects an inserted line without marking subsequent unchanged lines', () => {
    expect(computeChangedLines('a\nb\nc', 'a\nNEW\nb\nc')).toEqual([2]);
  });

  it('detects multiple inserted lines', () => {
    expect(computeChangedLines('a\nb', 'a\nX\nY\nb')).toEqual([2, 3]);
  });

  it('does not mark remaining lines when a line is deleted', () => {
    expect(computeChangedLines('a\nb\nc', 'a\nc')).toEqual([]);
  });

  it('detects a replaced and inserted line together', () => {
    expect(computeChangedLines('a\nb\nc', 'a\nX\nNEW\nc')).toEqual([2, 3]);
  });

  it('marks all lines as changed when original is empty', () => {
    expect(computeChangedLines('', 'a\nb')).toEqual([1, 2]);
  });

  it('returns empty when current is empty', () => {
    expect(computeChangedLines('a\nb', '')).toEqual([]);
  });

  it('detects insertion at the beginning', () => {
    expect(computeChangedLines('a\nb', 'NEW\na\nb')).toEqual([1]);
  });

  it('detects insertion at the end', () => {
    expect(computeChangedLines('a\nb', 'a\nb\nNEW')).toEqual([3]);
  });
});

describe('useLineDifferencesDecorations', () => {
  it('does nothing when editor is null', () => {
    renderHook(() =>
      useLineDifferencesDecorations({
        editor: null,
        savedValue: 'a\nb',
        currentValue: 'a\nX',
      })
    );
  });

  it('does not create decorations when values are identical', () => {
    const { editor, createDecorationsCollectionFn } = createMockEditor();

    renderHook(() =>
      useLineDifferencesDecorations({
        editor,
        savedValue: 'a\nb',
        currentValue: 'a\nb',
      })
    );

    expect(createDecorationsCollectionFn).not.toHaveBeenCalled();
  });

  it('creates decorations for changed lines', () => {
    const { editor, createDecorationsCollectionFn } = createMockEditor();

    renderHook(() =>
      useLineDifferencesDecorations({
        editor,
        savedValue: 'a\nb\nc',
        currentValue: 'a\nX\nc',
      })
    );

    expect(createDecorationsCollectionFn).toHaveBeenCalledWith([
      expect.objectContaining({
        range: expect.objectContaining({ startLineNumber: 2 }),
        options: expect.objectContaining({
          linesDecorationsClassName: 'templateChangedLineDecoration',
        }),
      }),
    ]);
  });

  it('only marks the inserted line, not lines after it', () => {
    const { editor, createDecorationsCollectionFn } = createMockEditor();

    renderHook(() =>
      useLineDifferencesDecorations({
        editor,
        savedValue: 'a\nb\nc',
        currentValue: 'a\nNEW\nb\nc',
      })
    );

    expect(createDecorationsCollectionFn).toHaveBeenCalledTimes(1);
    const decorations = createDecorationsCollectionFn.mock.calls[0][0] as unknown[];
    expect(decorations).toHaveLength(1);
    expect(decorations[0]).toEqual(
      expect.objectContaining({
        range: expect.objectContaining({ startLineNumber: 2 }),
      })
    );
  });

  it('clears previous decorations on re-render', () => {
    const { editor, clearFn } = createMockEditor();

    const { rerender } = renderHook(
      ({ saved, current }) =>
        useLineDifferencesDecorations({
          editor,
          savedValue: saved,
          currentValue: current,
        }),
      { initialProps: { saved: 'a', current: 'b' } }
    );

    rerender({ saved: 'a', current: 'c' });

    expect(clearFn).toHaveBeenCalled();
  });
});
