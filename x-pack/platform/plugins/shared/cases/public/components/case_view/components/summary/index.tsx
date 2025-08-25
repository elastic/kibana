/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { EuiFlexItem, EuiSpacer } from '@elastic/eui';
import * as i18n from './translations';
import { CaseSummaryContents } from './contents';
import { useGetCaseSummary } from '../../../../containers/use_get_case_summary';
import { useGetInferenceConnectors } from '../../../../containers/use_get_inference_connectors';
import { useLicense } from '../../../../common/use_license';

export const CaseSummary = React.memo(({ caseId }: { caseId: string }) => {
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

  const handleCaseSummaryClick = useCallback(() => {
    fetchCaseSummary();
  }, [fetchCaseSummary]);

  const { isAtLeastEnterprise } = useLicense();

  if (!isAtLeastEnterprise() || !connectorId) {
    return null;
  }

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
        error={summaryError}
      />
      <EuiSpacer size="m" />
    </EuiFlexItem>
  );
});

CaseSummary.displayName = 'CaseSummary';
