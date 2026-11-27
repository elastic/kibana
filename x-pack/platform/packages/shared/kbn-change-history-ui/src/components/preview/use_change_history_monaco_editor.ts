/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RefObject } from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { useEuiTheme } from '@elastic/eui';
import { applyKbnCodeEditorChromeOverrides, monaco } from '@kbn/code-editor';

import type { ChangeHistoryDiffViewMode } from '../../telemetry';
import type { ChangeHistoryDiffTelemetry } from '../../types';
import type {
  ChangeHistoryMonacoLanguage,
  ChangeHistoryPreviewEditorContext,
} from './change_history_preview';
import {
  CHANGE_HISTORY_DIFF_GLOBAL_EDITOR_OPTIONS,
  CHANGE_HISTORY_DIFF_MONACO_BASE_OPTIONS,
  CHANGE_HISTORY_PREVIEW_MONACO_OPTIONS,
  CHANGE_HISTORY_SPLIT_DIFF_EDITOR_OPTIONS,
  CHANGE_HISTORY_UNIFIED_DIFF_EDITOR_OPTIONS,
  CHANGE_HISTORY_UNIFIED_DIFF_MODIFIED_EDITOR_OPTIONS,
} from './monaco_options';
import { changeHistoryEditorChromeOverrides, useChangeHistoryMonacoTheme } from './monaco_theme';

const getDiffEditorOptions = (
  diffMode: ChangeHistoryDiffViewMode,
  theme: string,
  editorOptions: monaco.editor.IEditorOptions | undefined
): monaco.editor.IStandaloneDiffEditorConstructionOptions => ({
  ...CHANGE_HISTORY_DIFF_MONACO_BASE_OPTIONS,
  theme,
  ...(diffMode === 'split'
    ? CHANGE_HISTORY_SPLIT_DIFF_EDITOR_OPTIONS
    : CHANGE_HISTORY_UNIFIED_DIFF_MODIFIED_EDITOR_OPTIONS),
  ...editorOptions,
  renderSideBySide: diffMode === 'split',
  renderIndicators: diffMode === 'split',
});

export const configureDiffEditors = (
  diffEditor: monaco.editor.IStandaloneDiffEditor,
  diffMode: ChangeHistoryDiffViewMode,
  editorOptions: monaco.editor.IEditorOptions | undefined
): void => {
  const sharedChildOptions: monaco.editor.IEditorOptions & monaco.editor.IGlobalEditorOptions = {
    ...CHANGE_HISTORY_DIFF_GLOBAL_EDITOR_OPTIONS,
    glyphMargin: false,
    folding: false,
    ...editorOptions,
  };

  if (diffMode === 'split') {
    const splitOptions: monaco.editor.IEditorOptions = {
      ...sharedChildOptions,
      ...CHANGE_HISTORY_SPLIT_DIFF_EDITOR_OPTIONS,
    };
    diffEditor.getOriginalEditor().updateOptions(splitOptions);
    diffEditor.getModifiedEditor().updateOptions(splitOptions);
    return;
  }

  diffEditor.getOriginalEditor().updateOptions({
    ...sharedChildOptions,
    ...CHANGE_HISTORY_UNIFIED_DIFF_EDITOR_OPTIONS,
  });
  diffEditor.getModifiedEditor().updateOptions({
    ...sharedChildOptions,
    ...CHANGE_HISTORY_UNIFIED_DIFF_MODIFIED_EDITOR_OPTIONS,
  });
};

const getChangeStartLine = (change: monaco.editor.ILineChange): number => {
  if (change.modifiedStartLineNumber > 0) {
    return change.modifiedStartLineNumber;
  }

  return change.originalStartLineNumber;
};

const getChangeEndLine = (change: monaco.editor.ILineChange): number => {
  if (change.modifiedEndLineNumber > 0) {
    return change.modifiedEndLineNumber;
  }

  return change.originalEndLineNumber;
};

const scrollDiffEditorToChange = (
  diffEditor: monaco.editor.IStandaloneDiffEditor,
  changeIndex: number
): boolean => {
  const changes = diffEditor.getLineChanges() ?? [];
  if (changes.length === 0) {
    return false;
  }

  const boundedIndex = Math.max(0, Math.min(changeIndex, changes.length - 1));
  const change = changes[boundedIndex];
  const startLine = getChangeStartLine(change);
  if (startLine <= 0) {
    return false;
  }

  const endLine = Math.max(startLine, getChangeEndLine(change));

  diffEditor.setPosition({ lineNumber: startLine, column: 1 });
  if (endLine > startLine) {
    diffEditor.revealLinesInCenter(startLine, endLine);
  } else {
    diffEditor.revealLineInCenter(startLine);
  }

  return true;
};

/** Diff navigation state and handlers, reported to the parent so it can render the navigator. */
export interface ChangeHistoryDiffNavigation {
  currentIndex: number;
  totalChanges: number;
  onPrevious: () => void;
  onNext: () => void;
}

export interface UseChangeHistoryMonacoEditorParams {
  baseline?: string;
  target: string;
  language: ChangeHistoryMonacoLanguage;
  editorOptions?: monaco.editor.IEditorOptions;
  diffMode: ChangeHistoryDiffViewMode;
  diffTelemetry?: ChangeHistoryDiffTelemetry;
}

export interface UseChangeHistoryMonacoEditorResult {
  /** Attach to the element Monaco should render into. */
  containerRef: RefObject<HTMLDivElement>;
  editorContext: ChangeHistoryPreviewEditorContext;
  diffNavigation: ChangeHistoryDiffNavigation;
}

/** Owns the Monaco editor (single or diff) lifecycle, plus the diff navigation state. */
export const useChangeHistoryMonacoEditor = ({
  baseline,
  target,
  language,
  editorOptions,
  diffMode,
  diffTelemetry,
}: UseChangeHistoryMonacoEditorParams): UseChangeHistoryMonacoEditorResult => {
  const containerRef = useRef<HTMLDivElement>(null);
  const diffEditorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const [isEditorMounted, setIsEditorMounted] = useState(false);
  const pendingDiffScrollIndexRef = useRef<number | null>(null);
  const [diffCurrentIndex, setDiffCurrentIndex] = useState(0);
  const [diffTotalChanges, setDiffTotalChanges] = useState(0);

  const diffModeRef = useRef(diffMode);
  diffModeRef.current = diffMode;
  const editorOptionsRef = useRef(editorOptions);
  editorOptionsRef.current = editorOptions;

  const euiThemeContext = useEuiTheme();
  const monacoTheme = useChangeHistoryMonacoTheme();
  const monacoThemeRef = useRef(monacoTheme);
  monacoThemeRef.current = monacoTheme;

  const isCompareMode = baseline !== undefined;

  const getActiveEditor = useCallback(
    () => editorRef.current ?? diffEditorRef.current?.getModifiedEditor() ?? null,
    []
  );

  const stableConfigureDiffEditors = useCallback(
    (
      diffEditor: monaco.editor.IStandaloneDiffEditor,
      mode: ChangeHistoryDiffViewMode,
      extraOptions?: monaco.editor.IEditorOptions
    ) => configureDiffEditors(diffEditor, mode, extraOptions ?? editorOptionsRef.current),
    []
  );

  const editorContext = useMemo<ChangeHistoryPreviewEditorContext>(
    () => ({
      isEditorMounted,
      getActiveEditor,
      editorRef,
      diffEditorRef,
      decorationsRef,
      diffModeRef,
      configureDiffEditors: stableConfigureDiffEditors,
    }),
    [isEditorMounted, getActiveEditor, stableConfigureDiffEditors]
  );

  const updateDiffState = useCallback((editor: monaco.editor.IStandaloneDiffEditor) => {
    const changes = editor.getLineChanges() ?? [];
    setDiffTotalChanges(changes.length);
    setDiffCurrentIndex((currentIndex) =>
      changes.length === 0 ? 0 : Math.min(currentIndex, changes.length - 1)
    );
  }, []);

  const handleDiffPrevious = useCallback(() => {
    const diffEditor = diffEditorRef.current;
    if (!diffEditor || (diffEditor.getLineChanges() ?? []).length === 0) {
      return;
    }

    diffTelemetry?.reportDiffChangeNavigated('line_hunk');

    setDiffCurrentIndex((currentIndex) => {
      const nextIndex = Math.max(currentIndex - 1, 0);
      pendingDiffScrollIndexRef.current = null;
      scrollDiffEditorToChange(diffEditor, nextIndex);
      return nextIndex;
    });
  }, [diffTelemetry]);

  const handleDiffNext = useCallback(() => {
    const diffEditor = diffEditorRef.current;
    const changes = diffEditor?.getLineChanges() ?? [];
    if (!diffEditor || changes.length === 0) {
      return;
    }

    diffTelemetry?.reportDiffChangeNavigated('line_hunk');

    setDiffCurrentIndex((currentIndex) => {
      const nextIndex = Math.min(currentIndex + 1, Math.max(changes.length - 1, 0));
      pendingDiffScrollIndexRef.current = null;
      scrollDiffEditorToChange(diffEditor, nextIndex);
      return nextIndex;
    });
  }, [diffTelemetry]);

  const diffNavigation = useMemo<ChangeHistoryDiffNavigation>(
    () => ({
      currentIndex: diffCurrentIndex,
      totalChanges: diffTotalChanges,
      onPrevious: handleDiffPrevious,
      onNext: handleDiffNext,
    }),
    [diffCurrentIndex, diffTotalChanges, handleDiffPrevious, handleDiffNext]
  );

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    if (isCompareMode) {
      const mountDiffMode = diffModeRef.current;
      const originalModel = monaco.editor.createModel(baseline, language);
      const modifiedModel = monaco.editor.createModel(target, language);
      const diffEditor = monaco.editor.createDiffEditor(
        container,
        getDiffEditorOptions(mountDiffMode, monacoThemeRef.current, editorOptionsRef.current)
      );

      diffEditor.setModel({ original: originalModel, modified: modifiedModel });
      configureDiffEditors(diffEditor, mountDiffMode, editorOptionsRef.current);
      diffEditor.layout();
      diffEditorRef.current = diffEditor;
      editorRef.current = null;
      setIsEditorMounted(true);
      pendingDiffScrollIndexRef.current = 0;
      setDiffCurrentIndex(0);

      updateDiffState(diffEditor);
      const diffDisposable = diffEditor.onDidUpdateDiff(() => {
        updateDiffState(diffEditor);

        const pendingIndex = pendingDiffScrollIndexRef.current;
        if (pendingIndex !== null && scrollDiffEditorToChange(diffEditor, pendingIndex)) {
          pendingDiffScrollIndexRef.current = null;
        }
      });

      return () => {
        diffDisposable.dispose();
        diffEditor.dispose();
        originalModel.dispose();
        modifiedModel.dispose();
        diffEditorRef.current = null;
        decorationsRef.current?.clear();
        decorationsRef.current = null;
        setIsEditorMounted(false);
      };
    }

    const model = monaco.editor.createModel(target, language);
    const editor = monaco.editor.create(container, {
      ...CHANGE_HISTORY_PREVIEW_MONACO_OPTIONS,
      ...editorOptionsRef.current,
      theme: monacoThemeRef.current,
      model,
    });
    editor.layout();

    editorRef.current = editor;
    diffEditorRef.current = null;
    setIsEditorMounted(true);
    setDiffTotalChanges(0);
    setDiffCurrentIndex(0);

    return () => {
      editor.dispose();
      model.dispose();
      editorRef.current = null;
      decorationsRef.current?.clear();
      decorationsRef.current = null;
      setIsEditorMounted(false);
    };
  }, [baseline, language, monacoTheme, target, updateDiffState, isCompareMode]);

  // Per-instance chrome (widget surfaces, gutter, diff colours). Keyed on the inputs that re-create
  // the editor above, plus the EUI theme so a light/dark switch re-applies without re-creating it.
  useEffect(() => {
    const node = editorRef.current?.getDomNode() ?? diffEditorRef.current?.getContainerDomNode();
    if (!node) {
      return;
    }

    const chrome = applyKbnCodeEditorChromeOverrides(
      [node],
      changeHistoryEditorChromeOverrides,
      euiThemeContext
    );

    return () => chrome.dispose();
  }, [baseline, language, target, isCompareMode, euiThemeContext]);

  useEffect(() => {
    const diffEditor = diffEditorRef.current;
    if (!diffEditor || !isCompareMode) {
      return;
    }

    diffEditor.updateOptions({
      renderSideBySide: diffMode === 'split',
      renderIndicators: diffMode === 'split',
    });
    configureDiffEditors(diffEditor, diffMode, editorOptionsRef.current);
    diffEditor.layout();
  }, [diffMode, isCompareMode]);

  // Consumer-supplied options (e.g. validation display) are applied after mount and on change.
  useEffect(() => {
    if (!editorOptions) {
      return;
    }

    editorRef.current?.updateOptions(editorOptions);
    const diffEditor = diffEditorRef.current;
    if (diffEditor) {
      diffEditor.updateOptions(editorOptions);
      configureDiffEditors(diffEditor, diffModeRef.current, editorOptions);
    }
  }, [editorOptions, baseline, target, language, monacoTheme]);

  return { containerRef, editorContext, diffNavigation };
};
