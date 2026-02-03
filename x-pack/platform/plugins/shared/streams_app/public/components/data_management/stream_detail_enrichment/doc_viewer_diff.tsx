/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DocView, DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React, { useEffect, useState, useRef, useMemo, useLayoutEffect } from 'react';
import { flattenObjectNestedLast } from '@kbn/object-utils';
import {
  CODE_EDITOR_DEFAULT_THEME_ID,
  XJsonLang,
  defaultThemesResolvers,
  monaco,
} from '@kbn/monaco';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { DEFAULT_MARGIN_BOTTOM, getTabContentAvailableHeight } from './get_height';

export const DocViewerContext = React.createContext<{
  originalSample?: Record<string, unknown>;
}>({});

export const useDocViewerContext = () => {
  const context = React.useContext(DocViewerContext);
  if (!context) {
    throw new Error('DocViewerContext must be used within a DocViewerContext.Provider');
  }
  return context;
};

function orderObjectKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(orderObjectKeys);
  } else if (obj && typeof obj === 'object') {
    return Object.keys(obj)
      .sort()
      .reduce((acc, key) => {
        acc[key] = orderObjectKeys((obj as any)[key]);
        return acc;
      }, {} as Record<string, unknown>);
  }
  return obj;
}

export const DOC_VIEW_DIFF_ID = 'doc_view_diff';

export const docViewDiff: DocView = {
  id: DOC_VIEW_DIFF_ID,
  title: i18n.translate(
    'xpack.streams.streamDetailView.managementTab.enrichment.simulationPlayground.docViews.diff.diffTitle',
    {
      defaultMessage: 'Diff viewer',
    }
  ),
  order: 15,
  render: (props) => <JsonDiffViewer {...props} />,
};

function JsonDiffViewer({ hit, decreaseAvailableHeightBy }: DocViewRenderProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const euiTheme = useEuiTheme();
  const [editorHeight, setEditorHeight] = useState<number>(0);

  const { originalSample } = useDocViewerContext();

  const originalValue = useMemo(
    () =>
      originalSample &&
      JSON.stringify(orderObjectKeys(flattenObjectNestedLast(originalSample)), null, 2),
    [originalSample]
  );
  const newValue = useMemo(
    () => JSON.stringify(orderObjectKeys(hit.flattened), null, 2),
    [hit.flattened]
  );

  // compute height based on wrapper container
  useEffect(() => {
    if (!wrapperRef.current) return;
    const height = getTabContentAvailableHeight(
      wrapperRef.current,
      decreaseAvailableHeightBy ?? DEFAULT_MARGIN_BOTTOM
    );
    setEditorHeight(height);
  }, [decreaseAvailableHeightBy]);

  const editorRef = useRef<monaco.editor.IDiffEditor | null>(null);

  useLayoutEffect(() => {
    if (!wrapperRef.current) return;
    const oldModel = monaco.editor.createModel(originalValue || '', XJsonLang.ID);
    const newModel = monaco.editor.createModel(newValue, XJsonLang.ID);
    if (!editorRef.current) {
      editorRef.current = monaco.editor.createDiffEditor(wrapperRef.current, {
        automaticLayout: true,
        theme: CODE_EDITOR_DEFAULT_THEME_ID,
      });
    }
    editorRef.current.setModel({ original: oldModel, modified: newModel });
    const commonOptions: monaco.editor.IEditorOptions = {
      lightbulb: { enabled: false },
      fontSize: 12,
      lineNumbers: 'off',
      minimap: { enabled: false },
      overviewRulerBorder: false,
      readOnly: true,
      scrollbar: {
        alwaysConsumeMouseWheel: false,

        useShadows: false,
      },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      wrappingIndent: 'indent',
      renderLineHighlight: 'none',
      matchBrackets: 'never',
      fontFamily: 'Roboto Mono',
      lineHeight: 21,
      contextmenu: false,
      // @ts-expect-error, see https://github.com/microsoft/monaco-editor/issues/3829
      'bracketPairColorization.enabled': false,
    };
    editorRef.current.updateOptions({
      ...commonOptions,
      renderSideBySide: false,
    });
    editorRef.current.getOriginalEditor().updateOptions(commonOptions);
    editorRef.current.getModifiedEditor().updateOptions(commonOptions);
  }, [originalValue, newValue, editorHeight]);

  useEffect(() => {
    // register default theme code editor theme
    Object.entries(defaultThemesResolvers).forEach(([themeId, themeResolver]) => {
      monaco.editor.defineTheme(themeId, themeResolver(euiTheme));
    });

    // register theme configurations for supported languages
    monaco.languages.getLanguages().forEach(({ id: languageId }) => {
      let languageThemeResolver;
      if (Boolean((languageThemeResolver = monaco.editor.getLanguageThemeResolver(languageId)))) {
        monaco.editor.defineTheme(languageId, languageThemeResolver!(euiTheme));
      }
    });
  }, [euiTheme]);

  return (
    <div
      ref={wrapperRef}
      className={css`
        width: 100%;
        height: ${editorHeight}px;
        // https://github.com/microsoft/monaco-editor/issues/3873
        .codicon-light-bulb {
          display: none !important;
        }
      `}
    />
  );
}
