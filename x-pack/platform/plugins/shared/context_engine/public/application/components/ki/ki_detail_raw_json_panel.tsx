/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CodeEditor } from '@kbn/code-editor';
import React, { useMemo } from 'react';
import type { GetKiResponse } from '../../../../common/http_api/knowledge_indicators';
import { buildKiDetailDocumentView } from './ki_detail_document_view';
import {
  KI_DETAIL_RAW_JSON_BOTTOM_OFFSET,
  useKiDetailViewportHeight,
} from './use_ki_detail_viewport_height';

const READ_ONLY_JSON_OPTIONS = {
  readOnly: true,
  domReadOnly: true,
  minimap: { enabled: false },
  lineNumbers: 'on',
  scrollBeyondLastLine: false,
  wordWrap: 'on',
  fontSize: 14,
} as const;

interface KiDetailRawJsonPanelProps {
  ki: GetKiResponse;
}

export const KiDetailRawJsonPanel = ({ ki }: KiDetailRawJsonPanelProps) => {
  const { containerRef, height } = useKiDetailViewportHeight(
    true,
    KI_DETAIL_RAW_JSON_BOTTOM_OFFSET
  );
  const json = useMemo(() => {
    const documentView = buildKiDetailDocumentView(ki);
    return JSON.stringify(documentView, null, 2);
  }, [ki]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', maxWidth: '100%' }}
      data-test-subj="contextKiDetailRawJsonPanel"
    >
      <CodeEditor
        languageId="json"
        value={json}
        height={height}
        width="100%"
        options={READ_ONLY_JSON_OPTIONS}
        isCopyable
        allowFullScreen
        data-test-subj="contextKiDetailRawJsonEditor"
      />
    </div>
  );
};
