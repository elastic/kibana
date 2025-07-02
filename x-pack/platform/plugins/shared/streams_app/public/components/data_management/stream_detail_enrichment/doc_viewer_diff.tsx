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
import { XJsonLang, monaco } from '@kbn/monaco';
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
  title: i18n.translate(
    'xpack.streams.streamDetailView.managementTab.enrichment.simulationPlayground.docViews.diff.diffTitle',
    {
      defaultMessage: 'Diff viewer',
    }
  ),
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

  const originalSample = additionalDocViewerProps?.originalSample as Record<string, unknown>;

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

  const editorRef = useRef<monaco.editor.IDiffEditor | null>(null);

  useLayoutEffect(() => {
    if (!wrapperRef.current) return;
    const oldModel = monaco.editor.createModel(originalValue, XJsonLang.ID);
    const newModel = monaco.editor.createModel(newValue, XJsonLang.ID);
    if (!editorRef.current) {
      editorRef.current = monaco.editor.createDiffEditor(wrapperRef.current, {
        automaticLayout: true,
      });
    }
    editorRef.current.setModel({ original: oldModel, modified: newModel });
    editorRef.current.updateOptions({
      renderSideBySide: false,
      fontSize: 12,
      lineNumbers: 'on',
      minimap: { enabled: false },
      overviewRulerBorder: false,
      readOnly: true,
      scrollbar: { alwaysConsumeMouseWheel: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      wrappingIndent: 'indent',
    });
  }, [originalValue, newValue, editorHeight]);

  return <div ref={wrapperRef} style={{ width: '100%', height: editorHeight }} />;
}
