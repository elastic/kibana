/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { JsonCodeEditor } from '@kbn/unified-doc-viewer-plugin/public';
import type { DocView, DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { DEFAULT_MARGIN_BOTTOM, getTabContentAvailableHeight } from './get_height';

export const DOC_VIEW_JSON_ID = 'doc_view_json';

export const docViewJson: DocView = {
  id: DOC_VIEW_JSON_ID,
  title: i18n.translate(
    'xpack.streams.streamDetailView.managementTab.enrichment.simulationPlayground.docViews.json.jsonTitle',
    {
      defaultMessage: 'JSON',
    }
  ),
  order: 20,
  render: (props) => <JsonDocViewer {...props} />,
};

function JsonDocViewer({ hit, decreaseAvailableHeightBy }: DocViewRenderProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [editorHeight, setEditorHeight] = useState<number>(0);

  const jsonValue = useMemo(() => JSON.stringify(hit.raw, null, 2), [hit.raw]);

  // compute height based on wrapper container
  useEffect(() => {
    if (!wrapperRef.current) return;
    const height = getTabContentAvailableHeight(
      wrapperRef.current,
      decreaseAvailableHeightBy ?? DEFAULT_MARGIN_BOTTOM
    );
    setEditorHeight(height);
  }, [decreaseAvailableHeightBy, jsonValue]);
  return (
    <div ref={wrapperRef} style={{ width: '100%', height: '100%' }}>
      <JsonCodeEditor
        json={hit.raw as Record<string, unknown>}
        width="100%"
        height={editorHeight}
        hasLineNumbers
      />
    </div>
  );
}
