/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPanel, EuiText } from '@elastic/eui';
import { CodeEditor, ESQL_LANG_ID } from '@kbn/code-editor';

interface QuerySummaryProps {
  query: string;
  label?: string;
  maxLines?: number;
}

export const QuerySummary: React.FC<QuerySummaryProps> = ({ query, label, maxLines = 5 }) => {
  const actualLines = query.split('\n').length;
  const lineCount = Math.min(actualLines, maxLines);
  const height = lineCount * 44 + 16;
  const isScrollable = actualLines > maxLines;

  if (!query.trim()) {
    const emptyMessage = label
      ? i18n.translate(
          'xpack.responseOps.alertingV2RuleForm.composeDiscover.querySummary.noLabeledQueryDefinedLabel',
          { defaultMessage: 'No {label} defined', values: { label: label.toLowerCase() } }
        )
      : i18n.translate(
          'xpack.responseOps.alertingV2RuleForm.composeDiscover.querySummary.noQueryDefinedLabel',
          { defaultMessage: 'No query defined' }
        );
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
