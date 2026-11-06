/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiLink, EuiText } from '@elastic/eui';
import type { CaseViewSectionProps } from '@kbn/cases-plugin/public';
import { getLinkedInvestigationIds } from './case_data';
import { useLinkedInvestigationSummaries } from './related_investigations_section';
import { SIDEBAR } from './translations';

/**
 * Under the case's verdicts: how many investigations the case links and how many of their
 * proposals wait for a decision, linking to the Related tab where they are listed.
 */
export const VerdictSidebarLine: React.FC<CaseViewSectionProps> = ({ caseData }) => {
  const ids = useMemo(() => getLinkedInvestigationIds(caseData), [caseData]);
  const { data } = useLinkedInvestigationSummaries(caseData.id, ids);
  const pending = [...(data?.values() ?? [])].reduce(
    (total, summary) => total + (summary.pending_proposal_count ?? 0),
    0
  );
  // Same case, Related tab (its URL id stays similar_cases for links made before the rename).
  const relatedHref = '?tabId=similar_cases';

  return (
    <EuiText size="s" data-test-subj="cases-bridge-verdict-linked">
      <EuiLink href={relatedHref}>
        {SIDEBAR.linkedCount(ids.length)}
        {data ? ` · ${SIDEBAR.pendingCount(pending)}` : ''}
      </EuiLink>
    </EuiText>
  );
};
