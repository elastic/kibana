/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React, { useEffect, useState, useRef, useMemo, useLayoutEffect } from 'react';
import { flattenObjectNestedLast } from '@kbn/object-utils';
import { XJsonLang, defaultThemesResolvers, monaco } from '@kbn/monaco';
import { useEuiTheme } from '@elastic/eui';
import { DEFAULT_MARGIN_BOTTOM, getTabContentAvailableHeight } from './get_height';

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

export const docViewDiff = {
  id: 'doc_view_diff',
  title: i18n.translate('unifiedDocViewer.docViews.diff.diffTitle', {
    defaultMessage: 'Diff viewer',
  }),
  order: 15,
  component: JsonDiffViewer,
};

function JsonDiffViewer({
  hit,
  decreaseAvailableHeightBy,
  additionalDocViewerProps,
}: DocViewRenderProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [editorHeight, setEditorHeight] = useState<number>(0);
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor>();

  const originalSample = additionalDocViewerProps?.originalSample as Record<string, unknown>;

  // helper to recursively sort object keys
  const originalValue = useMemo(
    () => JSON.stringify(orderObjectKeys(flattenObjectNestedLast(originalSample)), null, 2),
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
  // compute diff
  return (
    <div ref={wrapperRef} style={{ width: '100%', height: '100%' }}>
      <MonacoDiffEditor
        oldValue={originalValue}
        newValue={newValue}
        width="100%"
        height={editorHeight}
        hasLineNumbers
        onEditorDidMount={setEditor}
        language={XJsonLang.ID}
      />
    </div>
  );
}

export function MonacoDiffEditor({
  width = '100%',
  height = '100%',
  value,
  oldValue = '',
  newValue = '',
  language = 'javascript',
  theme,
  options,
  editorWillMount,
  editorDidMount,
  editorWillUnmount,
  onChange,
  className,
}: any) {
  const containerElement = useRef<HTMLDivElement | null>(null);
  const euiTheme = useEuiTheme();

  const editor = useRef<monaco.editor.IDiffEditor | null>(null);

  const _subscription = useRef<monaco.IDisposable | null>(null);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const style = useMemo(
    () => ({
      width,
      height,
    }),
    [width, height]
  );

  const handleEditorWillMount = () => {
    const finalOptions = editorWillMount?.(monaco);
    return finalOptions || {};
  };

  const handleEditorWillUnmount = () => {
    editorWillUnmount?.(editor.current!, monaco);
  };

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

  const initMonaco = () => {
    if (containerElement.current) {
      // Before initializing monaco editor
      const finalOptions = { ...options, ...handleEditorWillMount() };

      const oldModel = monaco.editor.createModel(oldValue, language);
      const newModel = monaco.editor.createModel(newValue, language);

      editor.current = monaco.editor.createDiffEditor(containerElement.current, {
        automaticLayout: true,
      });
      editor.current.setModel({
        original: oldModel,
        modified: newModel,
      });
      editor.current.updateOptions({
        renderSideBySide: false,

        ...(className ? { extraEditorClassName: className } : {}),
        fontSize: 12,
        lineNumbers: 'on',
        minimap: {
          enabled: false,
        },
        overviewRulerBorder: false,
        readOnly: true,
        scrollbar: {
          alwaysConsumeMouseWheel: false,
        },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        wrappingIndent: 'indent',
        ...finalOptions,
        ...(theme ? { theme } : {}),
      });
    }
  };

  useLayoutEffect(() => {
    if (editor.current) {
      const oldModel = monaco.editor.createModel(oldValue, language);
      const newModel = monaco.editor.createModel(newValue, language);
      editor.current.setModel({
        original: oldModel,
        modified: newModel,
      });
      editor.current.layout();
    }
  }, [oldValue, newValue, language]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(initMonaco, []);

  // useEffect(() => {
  //   if (editor.current) {
  //     const model = editor.current.getModel();
  //     monaco.editor.setModelLanguage(model!, language);
  //   }
  // }, [language]);

  // useEffect(() => {
  //   if (editor.current) {
  //     // Don't pass in the model on update because monaco crashes if we pass the model
  //     // a second time. See https://github.com/microsoft/monaco-editor/issues/2027
  //     const { model: _model, ...optionsWithoutModel } = options;
  //     editor.current.updateOptions({
  //       ...(className ? { extraEditorClassName: className } : {}),
  //       ...optionsWithoutModel,
  //     });
  //   }
  // }, [className, options]);

  useEffect(() => {
    if (editor.current) {
      editor.current.layout();
    }
  }, [width, height]);

  // useEffect(() => {
  //   if (theme) {
  //     monaco.editor.setTheme(theme);
  //   }
  // }, [theme]);

  // useEffect(
  //   () => () => {
  //     if (editor.current) {
  //       handleEditorWillUnmount();
  //       editor.current.dispose();
  //     }
  //     if (_subscription.current) {
  //       _subscription.current.dispose();
  //     }
  //   },
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  //   []
  // );

  return <div ref={containerElement} style={style} className="react-monaco-editor-container" />;
}
