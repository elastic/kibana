/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { monaco } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import type { IngestPipelineJsonValidationError } from '../types';
import type { JsonLineMap } from '../utils/json_line_mapper';

/**
 * Adds validation error gutter markers to the Monaco editor.
 * These markers appear as warning icons in the gutter and show error details on hover.
 */
export const useGutterValidationMarkers = (
  editor: monaco.editor.IStandaloneCodeEditor | null,
  validationErrors: Map<string, IngestPipelineJsonValidationError[]> | undefined,
  jsonLineMap: JsonLineMap | undefined
) => {
  const glyphDecorations = useMemo(() => {
    if (!editor) {
      return null;
    }
    return editor.createDecorationsCollection();
  }, [editor]);

  useEffect(() => {
    if (!glyphDecorations) {
      return;
    }

    glyphDecorations.clear();

    if (!editor || !jsonLineMap || !validationErrors || validationErrors.size === 0) {
      return;
    }

    const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];

    validationErrors.forEach((errors, stepId) => {
      const lineInfo = jsonLineMap[stepId];
      if (!lineInfo || errors.length === 0) {
        return;
      }

      const hoverMessage = formatValidationErrors(errors);

      newDecorations.push({
        range: new monaco.Range(lineInfo.lineStart, 1, lineInfo.lineStart, 1),
        options: {
          isWholeLine: false,
          glyphMarginClassName: 'ingest-pipeline-sim-glyph ingest-pipeline-sim-glyph-failure',
          glyphMarginHoverMessage: { value: hoverMessage },
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      });
    });

    glyphDecorations.set(newDecorations);

    return () => {
      glyphDecorations.clear();
    };
  }, [glyphDecorations, editor, validationErrors, jsonLineMap]);
};

function formatValidationErrors(errors: IngestPipelineJsonValidationError[]): string {
  if (errors.length === 0) {
    return '';
  }

  const formattedErrors = errors.map((error, index) => {
    return i18n.translate('xpack.streams.ingestPipelineJsonEditor.validationError.entry', {
      defaultMessage: '**{entry}. {errorMessage}**',
      values: { entry: index + 1, errorMessage: error.message },
    });
  });

  return i18n.translate('xpack.streams.ingestPipelineJsonEditor.validationError.summary', {
    defaultMessage: '**⚠️ Validation Errors ({count})**\n\n{errors}',
    values: { count: errors.length, errors: formattedErrors.join('\n\n---\n\n') },
  });
}
