/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { diffLines } from 'diff';
import { monaco } from '@kbn/code-editor';

interface UseLineDifferencesDecorationsProps {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  savedValue?: string;
  currentValue: string;
}

/**
 * Uses the `diff` library's LCS-based `diffLines` to determine which lines in
 * `current` were added or modified relative to `original`.
 * Returns 1-based line numbers.
 */
export const computeChangedLines = (original: string, current: string): number[] => {
  const changes = diffLines(original, current, { ignoreNewlineAtEof: true });
  const changed: number[] = [];
  let lineNumber = 1;

  for (const change of changes) {
    const count = change.count ?? 0;

    if (!change.removed) {
      if (change.added) {
        for (let i = 0; i < count; i++) {
          changed.push(lineNumber + i);
        }
      }

      lineNumber += count;
    }
  }

  return changed;
};

/**
 * Highlights lines in the editor gutter that differ from the last saved value.
 */
export const useLineDifferencesDecorations = ({
  editor,
  savedValue,
  currentValue,
}: UseLineDifferencesDecorationsProps) => {
  const decorationsRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  useEffect(() => {
    if (!editor || savedValue === undefined) {
      return;
    }

    const model = editor.getModel();
    if (!model) {
      return;
    }

    if (decorationsRef.current) {
      decorationsRef.current.clear();
    }

    const changedLines = computeChangedLines(savedValue, currentValue);
    if (changedLines.length === 0) {
      return;
    }

    const decorations = changedLines.map((lineNumber) => ({
      range: new monaco.Range(lineNumber, 1, lineNumber, model.getLineMaxColumn(lineNumber)),
      options: {
        isWholeLine: true,
        linesDecorationsClassName: 'templateChangedLineDecoration',
      },
    }));

    decorationsRef.current = editor.createDecorationsCollection(decorations);

    return () => {
      decorationsRef.current?.clear();
    };
  }, [editor, savedValue, currentValue]);
};
