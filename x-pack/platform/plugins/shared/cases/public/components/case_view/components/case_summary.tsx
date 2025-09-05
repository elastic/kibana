/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { AISummary } from '@kbn/cases-ai';
import * as i18n from '../translations';
import { useGetCaseSummary } from '../../../containers/use_get_case_summary';
import { useGetInferenceConnectors } from '../../../containers/use_get_inference_connectors';
import { useLicense } from '../../../common/use_license';

export interface CaseSummaryProps {
  caseId: string;
}

export const CaseSummary = ({ caseId }: CaseSummaryProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  const { data: connectorsResponse } = useGetInferenceConnectors();
  const connectorId =
    connectorsResponse?.connectors && connectorsResponse.connectors.length > 0
      ? connectorsResponse.connectors[0].connectorId
      : '';

  const {
    data: summary,
    error: summaryError,
    refetch: fetchCaseSummary,
  } = useGetCaseSummary(caseId, connectorId);

  const handleCaseSummaryToggle = useCallback(
    async (isOpen: boolean) => {
      setIsSummaryOpen(isOpen);
      if (isOpen && !summary) {
        setIsLoading(true);
        await fetchCaseSummary();
        setIsLoading(false);
      }
    },
    [fetchCaseSummary, summary]
  );

  const { isAtLeastEnterprise } = useLicense();

  if (!isAtLeastEnterprise() || !connectorId) {
    return null;
  }

  return (
    <EuiFlexItem grow={false} data-test-subj="caseSummary">
      <AISummary
        title={i18n.CASE_SUMMARY_TITLE}
        summary={summary}
        isOpen={isSummaryOpen}
        onToggle={handleCaseSummaryToggle}
        error={summaryError}
        loading={isLoading}
      />
      <EuiSpacer size="m" />
    </EuiFlexItem>
  );
};

CaseSummary.displayName = 'CaseSummary';
