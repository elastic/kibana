/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';

import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';

import type { CaseUI } from '../../../../common/ui/types';

import { ObservablesTable } from '../../observables/observables_table';
import { useCaseObservables } from '../use_case_observables';
import type { OnUpdateFields } from '../types';

interface CaseViewObservablesProps {
  caseData: CaseUI;
  searchTerm?: string;
  isLoading: boolean;
  onUpdateField: (args: OnUpdateFields) => void;
}

export const CaseViewObservables = ({
  caseData,
  searchTerm,
  isLoading,
  onUpdateField,
}: CaseViewObservablesProps) => {
  const { observables, isLoading: isLoadingObservables } = useCaseObservables(caseData, searchTerm);

  const caseDataWithFilteredObservables: CaseUI = useMemo(() => {
    return {
      ...caseData,
      observables,
    };
  }, [caseData, observables]);

  const onExtractObservablesChanged = useCallback(
    (isOn: boolean) => {
      onUpdateField({
        key: 'settings',
        value: { ...caseData.settings, extractObservables: !isOn },
      });
    },
    [caseData.settings, onUpdateField]
  );

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiFlexGroup>
          <EuiFlexItem>
            <ObservablesTable
              caseData={caseDataWithFilteredObservables}
              isLoading={isLoading || isLoadingObservables}
              onExtractObservablesChanged={onExtractObservablesChanged}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

CaseViewObservables.displayName = 'CaseViewObservables';
