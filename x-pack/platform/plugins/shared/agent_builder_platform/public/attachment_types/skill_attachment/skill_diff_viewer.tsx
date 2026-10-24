/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  applyKbnCodeEditorChromeOverrides,
  CODE_EDITOR_DEFAULT_THEME_ID,
  initializeRegisteredLanguagesTheme,
  monaco,
  type KbnCodeEditorChromeOverrides,
} from '@kbn/code-editor';

const LINE_HEIGHT = 18;
const EDITOR_HEIGHT = 240;

const wrapperCss = css`
  /* Workaround for https://github.com/microsoft/monaco-editor/issues/3873:
     lightbulb on deleted lines ignores the lightbulb.enabled option. */
  .codicon.codicon-light-bulb.lightbulb-glyph {
    display: none;
  }
  /* In inline diff mode both editor.original and editor.modified render delete
     indicators at the same position, causing them to stack visually.
     Hides the duplicate indicator. */
  .editor.original .cldr.delete-sign.codicon.codicon-diff-remove::before {
    display: none;
  }
`;

// Applied in canvas view so the diff editor grows to fill the remaining flex space,
// leaving room for the badges below — identical to how EuiCodeBlock behaves.
const fullContentWrapperCss = css`
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
`;

interface UseDiffEditorParams {
  containerRef: React.RefObject<HTMLDivElement>;
  beforeContent: string;
  afterContent: string;
}

/**
 * The diff sits on the code block surface. The gutter and sticky scroll backgrounds default to the
 * editor background when a theme is built, which a per-instance override cannot reproduce, so the
 * value is repeated for them.
 */
export const skillDiffChromeOverrides: KbnCodeEditorChromeOverrides = ({ euiTheme }) => {
  const background = euiTheme.components.codeBackground;

  return {
    'editor.background': background,
    'editorGutter.background': background,
    'editorStickyScroll.background': background,
    'editorStickyScrollGutter.background': background,
  };
};

/** Creates and manages a Monaco inline diff editor bound to `containerRef`. */
const useDiffEditor = ({ containerRef, beforeContent, afterContent }: UseDiffEditorParams) => {
  const euiThemeContext = useEuiTheme();
  const editorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);

  // The editor is created directly with `monaco.editor.createDiffEditor`, so nothing else
  // guarantees the shared Kibana theme is registered before it mounts. Declared before the
  // editor-creating effect so it runs first.
  useEffect(() => {
    initializeRegisteredLanguagesTheme(euiThemeContext);
  }, [euiThemeContext]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const originalModel = monaco.editor.createModel(beforeContent, 'markdown');
    const modifiedModel = monaco.editor.createModel(afterContent, 'markdown');

    const diffEditor = monaco.editor.createDiffEditor(container, {
      theme: CODE_EDITOR_DEFAULT_THEME_ID,
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
      renderOverviewRuler: false,
      fontSize: 12,
      lineHeight: LINE_HEIGHT,
      padding: { top: 24, bottom: 24 },
      lineDecorationsWidth: 24,
      lightbulb: { enabled: monaco.editor.ShowLightbulbIconMode.Off },
      contextmenu: false,
      domReadOnly: true,
      renderIndicators: true,
      renderMarginRevertIcon: false,
    });

    diffEditor.setModel({ original: originalModel, modified: modifiedModel });
    editorRef.current = diffEditor;

    return () => {
      editorRef.current = null;
      diffEditor.dispose();
      originalModel.dispose();
      modifiedModel.dispose();
    };
  }, [containerRef, beforeContent, afterContent]);

  // Per-instance chrome. Keyed on the inputs that re-create the editor above, plus the EUI theme,
  // so a light/dark switch re-applies the colours without re-creating the editor.
  useEffect(() => {
    const node = editorRef.current?.getContainerDomNode();
    if (!node) {
      return;
    }

    const chrome = applyKbnCodeEditorChromeOverrides(
      [node],
      skillDiffChromeOverrides,
      euiThemeContext
    );

    return chrome.dispose;
  }, [containerRef, beforeContent, afterContent, euiThemeContext]);
};

interface SkillDiffViewerProps {
  beforeContent: string;
  afterContent: string;
  /** When true (canvas), grows to fill available flex space. When false (conversation), fixed 240px height. */
  showFullContent: boolean;
}

export const SkillDiffViewer: React.FC<SkillDiffViewerProps> = ({
  beforeContent,
  afterContent,
  showFullContent,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  useDiffEditor({ containerRef, beforeContent, afterContent });

  const containerHeight = showFullContent ? '100%' : EDITOR_HEIGHT;

  return (
    <div css={[wrapperCss, showFullContent && fullContentWrapperCss]}>
      <div ref={containerRef} style={{ height: containerHeight, width: '100%' }} />
    </div>
  );
};
