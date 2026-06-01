/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Change } from 'diff';
import { diffLines } from 'diff';
import { EuiButtonEmpty, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { monaco } from '@kbn/code-editor';
import { FormattedMessage } from '@kbn/i18n-react';

const LINE_HEIGHT = 18;
const PADDING = 8;
const HIDDEN_REGION_WIDGET_HEIGHT = 24;
const COLLAPSED_HEIGHT = 160;
const CONTEXT_LINE_COUNT = 3;
const MINIMUM_LINE_COUNT = 3;

/**
 * Estimates the pixel height the inline diff editor will occupy after
 * `hideUnchangedRegions` collapses unchanged hunks. Accepts pre-computed
 * diff parts to avoid a redundant `diffLines` call.
 */
const estimateContentHeight = (
  parts: Change[],
  contextLineCount: number,
  minimumLineCount: number
): number => {
  const lineRanges: Array<{ kind: 'changed' | 'unchanged'; lineCount: number }> = [];

  for (const part of parts) {
    const count = part.count ?? part.value.replace(/\n$/, '').split('\n').length;
    if (part.added || part.removed) {
      const last = lineRanges[lineRanges.length - 1];
      if (last?.kind === 'changed') {
        last.lineCount += count;
      } else {
        lineRanges.push({ kind: 'changed', lineCount: count });
      }
    } else {
      lineRanges.push({ kind: 'unchanged', lineCount: count });
    }
  }

  let visibleLines = 0;
  let hiddenRegions = 0;

  for (let i = 0; i < lineRanges.length; i++) {
    const range = lineRanges[i];
    if (range.kind === 'changed') {
      visibleLines += range.lineCount;
    } else {
      const isEdge = i === 0 || i === lineRanges.length - 1;
      const contextNeeded = isEdge ? contextLineCount : 2 * contextLineCount;
      const threshold = minimumLineCount + contextNeeded;
      if (range.lineCount >= threshold) {
        hiddenRegions++;
        visibleLines += contextNeeded;
      } else {
        visibleLines += range.lineCount;
      }
    }
  }

  return visibleLines * LINE_HEIGHT + hiddenRegions * HIDDEN_REGION_WIDGET_HEIGHT + PADDING;
};

const wrapperCss = css`
  position: relative;
  .diff-hidden-lines .center {
    gap: 8px;
  }
`;

const expandBarCss = css`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 48px;
  display: flex;
  align-items: flex-end;
  background: linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.05) 100%);

  .euiButtonEmpty {
    width: 100%;
  }
`;

interface UseDiffEditorParams {
  containerRef: React.RefObject<HTMLDivElement>;
  beforeContent: string;
  afterContent: string;
}

/**
 * Creates and manages a Monaco inline diff editor bound to `containerRef`.
 * Returns a ref to the editor so callers can trigger layout updates (e.g. on expand/collapse).
 */
const useDiffEditor = ({
  containerRef,
  beforeContent,
  afterContent,
}: UseDiffEditorParams): React.RefObject<monaco.editor.IDiffEditor | null> => {
  const editorRef = useRef<monaco.editor.IDiffEditor | null>(null);
  const { colorMode } = useEuiTheme();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const theme = colorMode === 'DARK' ? 'vs-dark' : 'vs';
    const originalModel = monaco.editor.createModel(beforeContent, 'markdown');
    const modifiedModel = monaco.editor.createModel(afterContent, 'markdown');

    const diffEditor = monaco.editor.createDiffEditor(container, {
      theme,
      readOnly: true,
      renderSideBySide: false,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      lineNumbers: 'off',
      folding: false,
      glyphMargin: false,
      overviewRulerLanes: 0,
      scrollbar: {
        vertical: 'hidden',
        horizontal: 'hidden',
        handleMouseWheel: false,
      },
      hideUnchangedRegions: {
        enabled: true,
        revealLineCount: 2,
        minimumLineCount: MINIMUM_LINE_COUNT,
        contextLineCount: CONTEXT_LINE_COUNT,
      },
      renderOverviewRuler: false,
      fontSize: 12,
      lineHeight: LINE_HEIGHT,
      padding: { top: 4, bottom: 4 },
      contextmenu: false,
      domReadOnly: true,
      renderIndicators: false,
      renderMarginRevertIcon: false,
    });

    diffEditor.setModel({ original: originalModel, modified: modifiedModel });
    editorRef.current = diffEditor;

    return () => {
      diffEditor.dispose();
      originalModel.dispose();
      modifiedModel.dispose();
      editorRef.current = null;
    };
  }, [containerRef, beforeContent, afterContent, colorMode]);

  return editorRef;
};

interface SkillDiffViewerProps {
  beforeContent: string;
  afterContent: string;
  /** When true, renders at full height without the collapse/expand controls. */
  showFullContent: boolean;
}

export const SkillDiffViewer: React.FC<SkillDiffViewerProps> = ({
  beforeContent,
  afterContent,
  showFullContent,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const estimatedHeight = useMemo(() => {
    const parts = diffLines(beforeContent, afterContent);
    return estimateContentHeight(parts, CONTEXT_LINE_COUNT, MINIMUM_LINE_COUNT);
  }, [beforeContent, afterContent]);

  const editorRef = useDiffEditor({ containerRef, beforeContent, afterContent });

  const collapsedHeight = Math.min(estimatedHeight, COLLAPSED_HEIGHT);
  const needsExpansion = !showFullContent && estimatedHeight > COLLAPSED_HEIGHT;

  const handleExpand = useCallback(() => {
    setIsExpanded(true);
    requestAnimationFrame(() => {
      editorRef.current?.getModifiedEditor().layout();
    });
  }, [editorRef]);

  const handleCollapse = useCallback(() => {
    setIsExpanded(false);
    requestAnimationFrame(() => {
      editorRef.current?.getModifiedEditor().layout();
    });
  }, [editorRef]);

  const collapsedWrapperStyles = { height: collapsedHeight, overflow: 'hidden' as const };
  let wrapperStyles;
  if (!showFullContent && !isExpanded) {
    wrapperStyles = collapsedWrapperStyles;
  }

  return (
    <div css={wrapperCss} style={wrapperStyles}>
      <div ref={containerRef} style={{ height: estimatedHeight, width: '100%' }} />
      {needsExpansion && !isExpanded && (
        <div css={expandBarCss}>
          <EuiButtonEmpty size="xs" iconType="arrowDown" color="primary" onClick={handleExpand}>
            <FormattedMessage
              id="xpack.agentBuilderPlatform.attachments.skill.diffViewer.showAll"
              defaultMessage="Show all"
            />
          </EuiButtonEmpty>
        </div>
      )}
      {needsExpansion && isExpanded && (
        <EuiButtonEmpty size="xs" iconType="arrowUp" color="primary" onClick={handleCollapse}>
          <FormattedMessage
            id="xpack.agentBuilderPlatform.attachments.skill.diffViewer.collapse"
            defaultMessage="Collapse"
          />
        </EuiButtonEmpty>
      )}
    </div>
  );
};
