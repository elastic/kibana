/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { monaco } from '@kbn/code-editor';

const LINE_HEIGHT = 18;
const CONTEXT_LINE_COUNT = 3;
const MINIMUM_LINE_COUNT = 3;
const EDITOR_HEIGHT = 240;

const wrapperCss = css`
  .diff-hidden-lines .center {
    gap: 8px;
  }
  /* Workaround for https://github.com/microsoft/monaco-editor/issues/3873:
     lightbulb on deleted lines ignores the lightbulb.enabled option. */
  .codicon.codicon-light-bulb.lightbulb-glyph {
    display: none;
  }
`;

interface UseDiffEditorParams {
  containerRef: React.RefObject<HTMLDivElement>;
  beforeContent: string;
  afterContent: string;
}

/** Creates and manages a Monaco inline diff editor bound to `containerRef`. */
const useDiffEditor = ({ containerRef, beforeContent, afterContent }: UseDiffEditorParams) => {
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
      wordWrap: 'on',
      scrollbar: {
        vertical: 'auto',
        horizontal: 'hidden',
        handleMouseWheel: true,
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
      padding: { top: 24, bottom: 24 },
      lightbulb: { enabled: false },
      contextmenu: false,
      domReadOnly: true,
      renderIndicators: false,
      renderMarginRevertIcon: false,
    });

    diffEditor.setModel({ original: originalModel, modified: modifiedModel });

    return () => {
      diffEditor.dispose();
      originalModel.dispose();
      modifiedModel.dispose();
    };
  }, [containerRef, beforeContent, afterContent, colorMode]);
};

interface SkillDiffViewerProps {
  beforeContent: string;
  afterContent: string;
}

export const SkillDiffViewer: React.FC<SkillDiffViewerProps> = ({
  beforeContent,
  afterContent,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  useDiffEditor({ containerRef, beforeContent, afterContent });

  return (
    <div css={wrapperCss}>
      <div ref={containerRef} style={{ height: EDITOR_HEIGHT, width: '100%' }} />
    </div>
  );
};
