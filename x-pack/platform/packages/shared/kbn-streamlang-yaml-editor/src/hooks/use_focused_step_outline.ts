/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { useEffect, useMemo, useState } from 'react';
import { monaco } from '@kbn/monaco';
import type { YamlLineMap } from '../utils/yaml_line_mapper';
import { getFocusedStepOutlineStyles } from '../styles';

interface FocusedStepInfo {
  stepId: string;
  lineStart: number;
  lineEnd: number;
}

/**
 * Monaco's SuggestController internal API (partial typing for what we use).
 * State 0 = hidden, other states = visible/active.
 */
interface SuggestController extends monaco.editor.IEditorContribution {
  model?: {
    state: number;
  };
}

/**
 * Monaco's SnippetController2 internal API (partial typing for what we use).
 */
interface SnippetController extends monaco.editor.IEditorContribution {
  isInSnippet?: () => boolean;
}

export const useFocusedStepOutline = (
  editor: monaco.editor.IStandaloneCodeEditor | null,
  yamlLineMap: YamlLineMap | undefined
) => {
  const [focusedStepInfo, setFocusedStepInfo] = useState<FocusedStepInfo | null>(null);

  const { euiTheme } = useEuiTheme();
  const scrollbarWidth = '24px';
  const styles = useMemo(
    () => getFocusedStepOutlineStyles({ euiTheme, scrollbarWidth }),
    [euiTheme, scrollbarWidth]
  );

  const decorationsCollection = useMemo(() => {
    if (!editor) {
      return null;
    }
    return editor.createDecorationsCollection();
  }, [editor]);

  // Track cursor position changes and find the focused step
  useEffect(() => {
    if (!editor || !yamlLineMap) {
      // Clear focused step info when editor or yamlLineMap is not available
      setFocusedStepInfo(null);
      return;
    }

    const updateFocusedStep = () => {
      // Skip updating focus when suggestion widget or snippet controller is active
      const suggestController = editor.getContribution(
        'editor.contrib.suggestController'
      ) as SuggestController | null;
      const snippetController = editor.getContribution(
        'snippetController2'
      ) as SnippetController | null;

      const isSuggestWidgetVisible = suggestController?.model?.state !== 0;
      const isSnippetSessionActive = snippetController?.isInSnippet?.();

      if (isSuggestWidgetVisible || isSnippetSessionActive) {
        return;
      }

      const position = editor.getPosition();
      if (!position) {
        setFocusedStepInfo(null);
        return;
      }

      const cursorLine = position.lineNumber;

      // Find the step that contains the cursor position
      const matchingSteps = Object.entries(yamlLineMap).filter(([, lineInfo]) => {
        return cursorLine >= lineInfo.lineStart && cursorLine <= lineInfo.lineEnd;
      });

      if (matchingSteps.length === 0) {
        setFocusedStepInfo(null);
        return;
      }

      const [stepId, lineInfo] = matchingSteps.reduce((best, current) => {
        const [, bestInfo] = best;
        const [, currentInfo] = current;

        const bestRange = bestInfo.lineEnd - bestInfo.lineStart;
        const currentRange = currentInfo.lineEnd - currentInfo.lineStart;

        if (currentRange < bestRange) {
          return current;
        }

        if (currentRange === bestRange && currentInfo.lineStart > bestInfo.lineStart) {
          return current;
        }

        return best;
      });

      setFocusedStepInfo({
        stepId,
        lineStart: lineInfo.lineStart,
        lineEnd: lineInfo.lineEnd,
      });
    };

    // Update on cursor position change
    const disposable = editor.onDidChangeCursorPosition(updateFocusedStep);

    // Initial update
    updateFocusedStep();

    return () => {
      disposable.dispose();
    };
  }, [editor, yamlLineMap]);

  // Apply decorations for the focused step
  useEffect(() => {
    if (!editor || !decorationsCollection) {
      return;
    }

    decorationsCollection.clear();

    if (!focusedStepInfo) {
      return;
    }

    const decorations: monaco.editor.IModelDeltaDecoration[] = [];

    for (
      let lineNumber = focusedStepInfo.lineStart;
      lineNumber <= focusedStepInfo.lineEnd;
      lineNumber++
    ) {
      const isFirstLine = lineNumber === focusedStepInfo.lineStart;
      const isLastLine = lineNumber === focusedStepInfo.lineEnd;
      const isSingleLine = focusedStepInfo.lineStart === focusedStepInfo.lineEnd;

      let className = 'streamlang-step-selected-middle';
      if (isSingleLine) {
        className = 'streamlang-step-selected-single';
      } else if (isFirstLine) {
        className = 'streamlang-step-selected-first';
      } else if (isLastLine) {
        className = 'streamlang-step-selected-last';
      }

      decorations.push({
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
          className,
          isWholeLine: true,
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      });
    }

    decorationsCollection.set(decorations);
  }, [editor, focusedStepInfo, decorationsCollection]);

  return { styles, focusedStepInfo };
};
