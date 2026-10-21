/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiCopy, EuiButtonIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { CodeEditor, ESQL_LANG_ID, type monaco } from '@kbn/code-editor';
import { prettifyQuery } from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
import { ESQL_CODE_EDITOR_OPTIONS, ESQL_EDITOR_LINE_HEIGHT } from '../flyout/compose_discover/constants';
import { splitQueryForHighlight } from './build_pipeline_steps';

const COPY_LABEL = i18n.translate('xpack.alertingV2.queryPipelineExplainer.copyQuery', {
  defaultMessage: 'Copy query',
});

const SEGMENT_DECORATION = 'alertingV2PipelineQuerySegment';
const MUTED_DECORATION = 'alertingV2PipelineQueryMuted';

const formatQuery = (query: string): string => {
  try {
    const pretty = prettifyQuery(query);
    return pretty.trim() ? pretty : query;
  } catch {
    return query;
  }
};

/**
 * Read-only ES|QL block using Discover's Monaco language + theme, with the
 * active pipeline segment emphasized via decorations.
 */
export const HighlightedEsqlBlock = ({
  query,
  highlightSegment,
  maxHeight = 320,
}: {
  query: string;
  highlightSegment?: string;
  maxHeight?: number;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  // Prefer a prettified query, but keep the raw source when prettify reflows
  // whitespace and would break segment highlighting.
  const displayQuery = useMemo(() => {
    const pretty = formatQuery(query);
    if (!highlightSegment?.trim()) {
      return pretty;
    }
    if (splitQueryForHighlight(pretty, highlightSegment).highlight) {
      return pretty;
    }
    if (splitQueryForHighlight(query, highlightSegment).highlight) {
      return query;
    }
    return pretty;
  }, [highlightSegment, query]);
  const [height, setHeight] = useState(
    () => Math.min(maxHeight, displayQuery.split('\n').length * ESQL_EDITOR_LINE_HEIGHT + 24)
  );

  const { before, highlight, after } = useMemo(() => {
    if (highlightSegment?.trim()) {
      const split = splitQueryForHighlight(displayQuery, highlightSegment);
      if (split.highlight) {
        return split;
      }
    }
    // No matching segment — show the full query without a muted/emphasized split.
    return { before: '', highlight: displayQuery, after: '' };
  }, [displayQuery, highlightSegment]);

  const editorOptions = useMemo(
    (): monaco.editor.IStandaloneEditorConstructionOptions => ({
      ...ESQL_CODE_EDITOR_OPTIONS,
      readOnly: true,
      domReadOnly: true,
      lineNumbers: 'off',
      folding: false,
      renderLineHighlight: 'none',
      overviewRulerLanes: 0,
      scrollbar: {
        vertical: 'auto',
        horizontal: 'hidden',
        alwaysConsumeMouseWheel: false,
      },
      contextmenu: false,
    }),
    []
  );

  const applyDecorations = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      const model = editor.getModel();
      if (!model) {
        return;
      }

      const decorations: monaco.editor.IModelDeltaDecoration[] = [];

      if (highlightSegment?.trim() && before) {
        const beforeStart = model.getPositionAt(0);
        const beforeEnd = model.getPositionAt(before.length);
        decorations.push({
          range: {
            startLineNumber: beforeStart.lineNumber,
            startColumn: beforeStart.column,
            endLineNumber: beforeEnd.lineNumber,
            endColumn: beforeEnd.column,
          },
          options: {
            inlineClassName: MUTED_DECORATION,
          },
        });
      }

      if (highlight) {
        const highlightStartOffset = before.length;
        const highlightEndOffset = before.length + highlight.length;
        // Only decorate a true segment — full-query "highlight" is the default view.
        if (highlightSegment?.trim() && highlight !== displayQuery) {
          const start = model.getPositionAt(highlightStartOffset);
          const end = model.getPositionAt(Math.min(highlightEndOffset, model.getValueLength()));
          decorations.push({
            range: {
              startLineNumber: start.lineNumber,
              startColumn: start.column,
              endLineNumber: end.lineNumber,
              endColumn: end.column,
            },
            options: {
              inlineClassName: SEGMENT_DECORATION,
            },
          });
        }
      }

      if (highlightSegment?.trim() && after) {
        const afterStartOffset = before.length + highlight.length;
        const start = model.getPositionAt(afterStartOffset);
        const end = model.getPositionAt(model.getValueLength());
        decorations.push({
          range: {
            startLineNumber: start.lineNumber,
            startColumn: start.column,
            endLineNumber: end.lineNumber,
            endColumn: end.column,
          },
          options: {
            inlineClassName: MUTED_DECORATION,
          },
        });
      }

      editor.createDecorationsCollection(decorations);
    },
    [after, before, displayQuery, highlight, highlightSegment]
  );

  const handleEditorMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      const updateHeight = () => {
        setHeight(Math.min(maxHeight, Math.max(ESQL_EDITOR_LINE_HEIGHT * 2, editor.getContentHeight())));
      };
      updateHeight();
      editor.onDidContentSizeChange(updateHeight);
      applyDecorations(editor);
    },
    [applyDecorations, maxHeight]
  );

  return (
    <div
      data-test-subj="queryPipelineActiveQuery"
      css={css`
        position: relative;
        border: ${euiTheme.border.thin};
        border-radius: ${euiTheme.border.radius.medium};
        background: ${euiTheme.colors.backgroundBasePlain};
        overflow: hidden;
        block-size: ${height}px;
        max-block-size: ${maxHeight}px;

        .${MUTED_DECORATION} {
          opacity: 0.45;
        }

        .${SEGMENT_DECORATION} {
          background: ${euiTheme.colors.backgroundBasePrimary};
          border-radius: ${euiTheme.border.radius.small};
        }
      `}
    >
      <div
        css={css`
          position: absolute;
          inset-block-start: ${euiTheme.size.s};
          inset-inline-end: ${euiTheme.size.s};
          z-index: 2;
        `}
      >
        <EuiCopy textToCopy={displayQuery}>
          {(copy) => (
            <EuiButtonIcon
              iconType="copy"
              aria-label={COPY_LABEL}
              color="text"
              size="s"
              onClick={copy}
              data-test-subj="queryPipelineCopyQuery"
            />
          )}
        </EuiCopy>
      </div>
      {/* Test hooks for the emphasized segment (Monaco tokens are not in the DOM as text nodes). */}
      <span hidden data-test-subj="queryPipelineQueryHighlight">
        {highlight}
      </span>
      {before ? (
        <span hidden data-test-subj="queryPipelineQueryMuted">
          {before}
        </span>
      ) : null}
      <CodeEditor
        key={`${displayQuery}::${highlightSegment ?? ''}`}
        languageId={ESQL_LANG_ID}
        value={displayQuery}
        height={height}
        options={editorOptions}
        editorDidMount={handleEditorMount}
        dataTestSubj="queryPipelineEsqlEditor"
      />
    </div>
  );
};
