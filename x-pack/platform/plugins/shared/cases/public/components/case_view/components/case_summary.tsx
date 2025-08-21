/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiCallOut, EuiFlexItem, EuiMarkdownFormat, EuiProgress, EuiSpacer } from '@elastic/eui';
import { useGetCaseSummary } from '../hooks/use_get_case_summary';
import { useGetConnectors } from '../hooks/use_get_connectors';

interface CaseSummaryProps {
  caseId: string;
}

export const CaseSummary: React.FC<CaseSummaryProps> = ({ caseId }) => {
  const { connectors, getConnectors } = useGetConnectors();
  const { isLoading, summary, error, getCaseSummary } = useGetCaseSummary();

  useEffect(() => {
    getConnectors();
  }, [getConnectors]);

  useEffect(() => {
    if (connectors.length > 0) {
      getCaseSummary({ caseId, connectorId: connectors[0].connectorId });
    }
  }, [getCaseSummary, connectors, caseId]);

  return (
    <EuiFlexItem grow={false} data-test-subj="case-summary">
      <EuiCallOut
        css={{
          maxHeight: '300px',
          overflowY: 'auto',
        }}
      >
        {isLoading && <EuiProgress size="xs" color="primary" />}
        {!error && <EuiMarkdownFormat textSize="s">{summary}</EuiMarkdownFormat>}
      </EuiCallOut>
      <EuiSpacer size="m" />
    </EuiFlexItem>
  );
};

CaseSummary.displayName = 'CaseSummary';
