/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import type { CaseViewCloseModalSectionProps } from '@kbn/cases-plugin/public';
import { getLinkedInvestigationIds } from './case_data';
import { formatCaseNumber } from './api';
import { useLinkedInvestigationSummaries } from './related_investigations_section';
import { CLOSE_MODAL } from './translations';

/**
 * The close modal's "Close N linked investigations" switch. On by default; turning it off leaves
 * the investigations open. The count of proposals it dismisses comes from each investigation.
 */
export const CloseModalSection: React.FC<CaseViewCloseModalSectionProps> = ({
  caseData,
  closeLinkedInvestigations,
  setCloseLinkedInvestigations,
}) => {
  const ids = useMemo(() => getLinkedInvestigationIds(caseData), [caseData]);
  const { data } = useLinkedInvestigationSummaries(caseData.id, ids);
  const open = [...(data?.values() ?? [])].filter(
    (summary) => summary.metadata.status !== 'closed'
  );
  const pending = open.reduce((total, summary) => total + (summary.pending_proposal_count ?? 0), 0);
  // Once loaded with nothing open there is nothing to close. While loading, or if the read
  // failed, the switch still shows (without counts): it is on by default and must be visible.
  if (data != null && open.length === 0) {
    return null;
  }
  const isKnown = data != null;

  return (
    <EuiFormRow
      fullWidth
      helpText={
        !isKnown
          ? undefined
          : pending > 0
          ? CLOSE_MODAL.pendingHelp(
              pending,
              formatCaseNumber({
                incremental_id: caseData.incrementalId,
                title: caseData.title,
              })
            )
          : CLOSE_MODAL.noPending
      }
    >
      <EuiSwitch
        label={
          isKnown
            ? CLOSE_MODAL.closeInvestigations(open.length)
            : CLOSE_MODAL.closeInvestigationsUnknown
        }
        checked={closeLinkedInvestigations}
        onChange={(event) => setCloseLinkedInvestigations(event.target.checked)}
        data-test-subj="cases-bridge-close-investigations-switch"
      />
    </EuiFormRow>
  );
};
