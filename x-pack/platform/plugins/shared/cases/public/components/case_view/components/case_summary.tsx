/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiCallOut, EuiFlexItem, EuiLoadingSpinner, EuiMarkdownFormat } from '@elastic/eui';
import type { CaseUI } from '../../../../common';
import { useCaseSummary } from '../hooks/use_case_summary';

interface CaseSummaryProps {
  caseData: CaseUI;
}

export const CaseSummary: React.FC<CaseSummaryProps> = ({ caseData }) => {
  const { summary, isLoading, generateSummary } = useCaseSummary({
    caseData,
  });

  useEffect(() => {
    generateSummary();
  }, [generateSummary]);

  return (
    <EuiFlexItem grow={false} data-test-subj="case-view-assignees">
      <EuiCallOut iconType="">
        {isLoading ? (
          <EuiLoadingSpinner size="m" />
        ) : (
          <EuiMarkdownFormat textSize="s">{summary}</EuiMarkdownFormat>
        )}
      </EuiCallOut>
    </EuiFlexItem>
  );
};

CaseSummary.displayName = 'CaseSummary';
