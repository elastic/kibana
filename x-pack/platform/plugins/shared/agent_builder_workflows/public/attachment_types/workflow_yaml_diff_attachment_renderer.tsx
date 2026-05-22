/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiButtonEmpty, EuiText, transparentize } from '@elastic/eui';
import { css } from '@emotion/react';
import type { Change } from 'diff';
import { diffLines } from 'diff';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { monaco } from '@kbn/monaco';
import { useWorkflowsMonacoTheme, WORKFLOWS_MONACO_EDITOR_THEME } from '@kbn/workflows-ui';

interface WorkflowYamlDiffData {
  beforeYaml: string;
  afterYaml: string;
  proposalId: string;
  workflowId?: string;
  name?: string;
}

interface WorkflowYamlDiffAttachment {
  id: string;
  type: string;
  data: WorkflowYamlDiffData;
}

const COLLAPSED_HEIGHT = 160;
const LINE_HEIGHT = 18;
const PADDING = 8;
const HIDDEN_REGION_WIDGET_HEIGHT = 24;

/**
 * Estimates the pixel height Monaco's inline diff editor will occupy
 * after hideUnchangedRegions collapses unchanged hunks.
 *
 * Accepts pre-computed diff parts to avoid redundant `diffLines` calls.
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
      const isFirst = i === 0;
      const isLast = i === lineRanges.length - 1;
      const contextNeeded = isFirst || isLast ? contextLineCount : 2 * contextLineCount;
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

const MonacoDiffViewer: React.FC<{
  beforeYaml: string;
  afterYaml: string;
}> = ({ beforeYaml, afterYaml }) => {
  const styles = useMemoCss(componentStyles);
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IDiffEditor | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);

  const contextLineCount = 3;
  const minimumLineCount = 3;

  const estimatedHeight = useMemo(() => {
    const parts = diffLines(beforeYaml, afterYaml);
    return estimateContentHeight(parts, contextLineCount, minimumLineCount);
  }, [beforeYaml, afterYaml]);

  const contentHeight = measuredHeight ?? estimatedHeight;
  const collapsedHeight = Math.min(contentHeight, COLLAPSED_HEIGHT);
  const needsExpansion = contentHeight > COLLAPSED_HEIGHT;

  const handleFocus = useCallback(() => {
    setIsActive(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsActive(false);
  }, []);

  useWorkflowsMonacoTheme();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const originalModel = monaco.editor.createModel(beforeYaml, 'yaml');
    const modifiedModel = monaco.editor.createModel(afterYaml, 'yaml');

    const diffEditor = monaco.editor.createDiffEditor(container, {
      theme: WORKFLOWS_MONACO_EDITOR_THEME,
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
        minimumLineCount,
        contextLineCount,
      },
      renderOverviewRuler: false,
      fontSize: 12,
      lineHeight: LINE_HEIGHT,
      padding: { top: 4, bottom: 4 },
      contextmenu: false,
      domReadOnly: true,
      lightbulb: { enabled: false },
      quickSuggestions: false,
      suggestOnTriggerCharacters: false,
      hover: { enabled: false },
      parameterHints: { enabled: false },
      renderIndicators: false,
      renderMarginRevertIcon: false,
    });

    diffEditor.setModel({ original: originalModel, modified: modifiedModel });

    editorRef.current = diffEditor;

    requestAnimationFrame(() => {
      const scrollable = container.querySelector(
        '.modified-in-monaco-diff-editor .monaco-scrollable-element'
      );
      if (scrollable && scrollable.clientHeight > 0) {
        setMeasuredHeight(scrollable.clientHeight);
      }
    });

    return () => {
      diffEditor.dispose();
      originalModel.dispose();
      modifiedModel.dispose();
      editorRef.current = null;
    };
  }, [beforeYaml, afterYaml, minimumLineCount, contextLineCount]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const enableScroll = isActive && isExpanded;
    editor.updateOptions({
      scrollbar: {
        vertical: enableScroll ? 'auto' : 'hidden',
        horizontal: enableScroll ? 'auto' : 'hidden',
        handleMouseWheel: enableScroll,
      },
    });
  }, [isActive, isExpanded]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      setIsActive(true);
    }
  }, []);

  const handleExpand = useCallback(() => {
    setIsExpanded(true);
    requestAnimationFrame(() => {
      editorRef.current?.getModifiedEditor().layout();
    });
  }, []);

  const handleCollapse = useCallback(() => {
    setIsExpanded(false);
    requestAnimationFrame(() => {
      editorRef.current?.getModifiedEditor().layout();
    });
  }, []);

  return (
    <div
      css={styles.wrapper}
      style={isExpanded ? undefined : { height: collapsedHeight, overflow: 'hidden' }}
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        ref={containerRef}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="region"
        aria-label="Workflow diff"
        style={{ height: contentHeight, width: '100%' }}
      />
      {needsExpansion && !isExpanded && (
        <div css={styles.expandBar}>
          <EuiButtonEmpty size="xs" iconType="arrowDown" color="primary" onClick={handleExpand}>
            {i18n.translate('workflowsManagement.attachmentRenderers.diff.showAll', {
              defaultMessage: 'Show all',
            })}
          </EuiButtonEmpty>
        </div>
      )}
      {needsExpansion && isExpanded && (
        <div css={styles.collapseBar}>
          <EuiButtonEmpty size="xs" iconType="arrowUp" color="primary" onClick={handleCollapse}>
            {i18n.translate('workflowsManagement.attachmentRenderers.diff.collapse', {
              defaultMessage: 'Collapse',
            })}
          </EuiButtonEmpty>
        </div>
      )}
    </div>
  );
};

const DiffInlineContent: React.FC<{
  attachment: WorkflowYamlDiffAttachment;
}> = ({ attachment }) => {
  const styles = useMemoCss(componentStyles);
  const { beforeYaml, afterYaml } = attachment.data;

  if (beforeYaml === afterYaml) {
    return (
      <EuiText size="s" color="subdued" css={styles.noChanges}>
        {i18n.translate('workflowsManagement.attachmentRenderers.diff.noChanges', {
          defaultMessage: 'No changes detected',
        })}
      </EuiText>
    );
  }

  return <MonacoDiffViewer beforeYaml={beforeYaml} afterYaml={afterYaml} />;
};

const componentStyles = {
  wrapper: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'relative',
      '.diff-hidden-lines .center': {
        gap: euiTheme.size.s,
      },
    }),
  expandBar: ({ euiTheme }: UseEuiTheme) =>
    css({
      transition: 'opacity 0.15s ease-out',
      opacity: 0.7,
      '&:hover': {
        opacity: 1,
      },
      '.euiButtonEmpty': {
        width: '100%',
        height: '100%',
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
      },
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 48,
      background: `linear-gradient(
        to bottom,
        ${transparentize(euiTheme.colors.backgroundBasePlain, 0)} 0%,
        ${transparentize(euiTheme.colors.backgroundBasePlain, 0.6)} 40%,
        ${euiTheme.colors.backgroundBasePlain} 100%
      )`,
    }),
  collapseBar: ({ euiTheme }: UseEuiTheme) =>
    css({
      transition: 'opacity 0.15s ease-out',
      opacity: 0.7,
      '&:hover': {
        opacity: 1,
      },
      '.euiButtonEmpty': {
        width: '100%',
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
      },
      background: `linear-gradient(
        to top,
        ${transparentize(euiTheme.colors.backgroundBasePlain, 0)} 0%,
        ${transparentize(euiTheme.colors.backgroundBasePlain, 0.6)} 40%,
        ${euiTheme.colors.backgroundBasePlain} 100%
      )`,
    }),
  header: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.s,
      borderBottom: euiTheme.border.thin,
    }),
  noChanges: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.s,
    }),
};

export const workflowYamlDiffAttachmentUiDefinition: AttachmentUIDefinition<WorkflowYamlDiffAttachment> =
  {
    getLabel: (attachment) =>
      attachment.data.name
        ? i18n.translate('workflowsManagement.attachmentRenderers.diff.labelWithName', {
            defaultMessage: '{name} changes',
            values: { name: attachment.data.name },
          })
        : i18n.translate('workflowsManagement.attachmentRenderers.diff.label', {
            defaultMessage: 'Workflow changes',
          }),
    getIcon: () => 'merge',
    renderInlineContent: ({ attachment }) => <DiffInlineContent attachment={attachment} />,
  };
