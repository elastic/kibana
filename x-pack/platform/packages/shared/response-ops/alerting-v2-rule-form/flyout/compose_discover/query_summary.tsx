/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const defaultEmptyMessage = i18n.translate(
  'xpack.alertingV2.composeDiscover.querySummary.noQueryDefined',
  { defaultMessage: 'No query defined' }
);

const copyAriaLabel = i18n.translate(
  'xpack.alertingV2.composeDiscover.querySummary.copyAriaLabel',
  { defaultMessage: 'Copy query' }
);

interface QuerySummaryProps {
  query: string;
  emptyMessage?: string;
}

export const QuerySummary: React.FC<QuerySummaryProps> = ({
  query,
  emptyMessage = defaultEmptyMessage,
}) => {
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
    <EuiCodeBlock
      language="esql"
      isCopyable
      copyAriaLabel={copyAriaLabel}
      paddingSize="s"
      fontSize="s"
      data-test-subj="composeDiscoverQuerySummary"
    >
      {query}
    </EuiCodeBlock>
  );
};

interface QueryBlockProps {
  label: React.ReactNode;
  query: string;
  emptyMessage?: string;
}

export const QueryBlock: React.FC<QueryBlockProps> = ({ label, query, emptyMessage }) => (
  <>
    <EuiText size="xs" color="subdued">
      <strong>{label}</strong>
    </EuiText>
    <EuiSpacer size="xs" />
    <QuerySummary query={query} emptyMessage={emptyMessage} />
  </>
);
