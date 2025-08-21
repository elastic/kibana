/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { EuiFlexItem, EuiSpacer } from '@elastic/eui';
import moment from 'moment';
import * as i18n from '../translations';
import { useGetCaseSummary } from '../hooks/use_get_case_summary';
import { useGetConnectors } from '../hooks/use_get_connectors';
import { CaseSummaryContents } from './case_summary_contents';

interface CaseSummaryProps {
  caseId: string;
}

export const CaseSummary: React.FC<CaseSummaryProps> = ({ caseId }) => {
  const { isLoading: connectorsLoading, connectors, getConnectors } = useGetConnectors();
  const { isLoading: caseSummaryLoading, summary, error, getCaseSummary } = useGetCaseSummary();
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [summaryGeneratedAt, setSummaryGeneratedAt] = useState('');

  useEffect(() => {
    getConnectors();
  }, [getConnectors]);

  const handleCaseSummaryClick = useCallback(() => {
    if (connectors.length > 0) {
      getCaseSummary({ caseId, connectorId: connectors[0].connectorId });
      setSummaryGeneratedAt(moment().toISOString());
    }
  }, [getCaseSummary, connectors, caseId]);

  return (
    <EuiFlexItem grow={false} data-test-subj="caseSummary">
      <CaseSummaryContents
        title={i18n.CASE_SUMMARY}
        onToggle={(isOpen) => {
          setIsSummaryOpen(isOpen);
          if (isOpen && !summary) {
            handleCaseSummaryClick();
          }
        }}
        isOpen={isSummaryOpen}
        summary={summary}
        summaryGeneratedAt={summaryGeneratedAt}
        error={error}
        loading={connectorsLoading || caseSummaryLoading}
      />
      <EuiSpacer size="m" />
    </EuiFlexItem>
  );
};

CaseSummary.displayName = 'CaseSummary';
