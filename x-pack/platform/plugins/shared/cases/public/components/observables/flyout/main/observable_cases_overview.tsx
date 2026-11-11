/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ObservableWithMetadata } from '../../../../../common/types/api';
import type { CaseUI } from '../../../../../common/ui/types';
import { useCountCasesByObservables } from '../../../../containers/use_count_cases_by_observables';
import { ExpandablePanel } from '../shared/expandable_panel';
import { InsightsSummaryRow } from './insights_summary_row';
import * as i18n from '../translations';

export interface ObservableCasesOverviewProps {
  observable: Pick<ObservableWithMetadata, 'typeKey' | 'value'>;
  caseData: Pick<CaseUI, 'id' | 'owner'>;
  /** Opens the cases tool. */
  onShowCases: () => void;
}

/**
 * The preview of the cases tool, styled like the Security alert flyout insights: a panel whose
 * title opens the tool, with the number of other cases holding the observable. The number is the
 * same uncapped count as the observables table's Related cases column.
 */
export const ObservableCasesOverview = ({
  observable: { typeKey, value },
  caseData: { id: caseId, owner },
  onShowCases,
}: ObservableCasesOverviewProps) => {
  // A count only: the tool loads the cases page by page.
  const { data, isLoading, isError } = useCountCasesByObservables({
    owner,
    excludeCaseId: caseId,
    observables: [{ typeKey, value }],
  });
  const total = data?.counts[0]?.total ?? 0;

  return (
    <ExpandablePanel
      header={{
        title: i18n.CASES_PANEL_TITLE,
        link: { callback: onShowCases, tooltip: i18n.CASES_PANEL_TOOLTIP },
      }}
      data-test-subj="cases-observable-flyout-cases"
    >
      <InsightsSummaryRow
        isLoading={isLoading}
        isError={isError}
        text={i18n.RELATED_CASES(total)}
        count={total}
        onShowDetails={total > 0 ? onShowCases : undefined}
        data-test-subj="cases-observable-flyout-related-cases"
      />
    </ExpandablePanel>
  );
};

ObservableCasesOverview.displayName = 'ObservableCasesOverview';
