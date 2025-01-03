/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';

import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';

import type { CaseUI } from '../../../../common/ui/types';

import { CASE_VIEW_PAGE_TABS } from '../../../../common/types';
import { CaseViewTabs } from '../case_view_tabs';
import { ObservablesTable } from '../../observables/observables_table';
import { ObservablesUtilityBar } from '../../observables/observables_utility_bar';
import { useCaseObservables } from '../use_case_observables';

interface CaseViewObservablesProps {
  caseData: CaseUI;
  isLoading: boolean;
}

export const CaseViewObservables = ({ caseData, isLoading }: CaseViewObservablesProps) => {
  const { observables, isLoading: isLoadingObservables } = useCaseObservables(caseData);

  const caseDataWithFilteredObservables: CaseUI = useMemo(() => {
    return {
      ...caseData,
      observables,
    };
  }, [caseData, observables]);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <CaseViewTabs caseData={caseData} activeTab={CASE_VIEW_PAGE_TABS.OBSERVABLES} />
        <EuiFlexGroup>
          <EuiFlexItem>
            <ObservablesUtilityBar caseData={caseData} />
            <ObservablesTable
              caseData={caseDataWithFilteredObservables}
              isLoading={isLoading || isLoadingObservables}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

CaseViewObservables.displayName = 'CaseViewObservables';
