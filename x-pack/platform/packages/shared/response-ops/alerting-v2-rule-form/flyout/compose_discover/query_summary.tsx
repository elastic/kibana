/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CodeEditor, ESQL_LANG_ID } from '@kbn/code-editor';

const defaultEmptyMessage = i18n.translate(
  'xpack.alertingV2.composeDiscover.querySummary.noQueryDefined',
  { defaultMessage: 'No query defined' }
);

interface QuerySummaryProps {
  query: string;
  emptyMessage?: string;
  maxLines?: number;
}

export const QuerySummary: React.FC<QuerySummaryProps> = ({
  query,
  emptyMessage = defaultEmptyMessage,
  maxLines = 5,
}) => {
  const actualLines = query.split('\n').length;
  const lineCount = Math.max(2, Math.min(actualLines, maxLines));
  const height = lineCount * 18 + 16;
  const isScrollable = actualLines > maxLines;

  if (!query.trim()) {
    return (
      <EuiPanel color="subdued" paddingSize="s">
        <EuiText size="s" color="subdued">
          {emptyMessage}
        </EuiText>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel color="subdued" paddingSize="none" hasBorder>
      <CodeEditor
        languageId={ESQL_LANG_ID}
        value={query}
        height={height}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          lineNumbers: 'off',
          scrollBeyondLastLine: false,
          folding: false,
          renderLineHighlight: 'none',
          overviewRulerLanes: 0,
          scrollbar: { vertical: isScrollable ? 'auto' : 'hidden', horizontal: 'hidden' },
          domReadOnly: true,
        }}
      />
    </EuiPanel>
  );
};
