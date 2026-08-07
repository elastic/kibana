/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import type { CaseUI, ObservableUI } from '../../../../common/ui/types';
import { ObservablesTable } from '../../observables/observables_table';
import type { OnUpdateFields } from '../types';
import { OBSERVABLES_TAB } from '../../user_actions/translations';
import { AttachmentAccordion } from './attachment_accordion';

export const OBSERVABLES_FILTER_ID = 'observables';

interface CaseViewObservablesProps {
  caseData: CaseUI;
  observables: ObservableUI[];
  searchTerm?: string;
  isLoading: boolean;
  onUpdateField: (args: OnUpdateFields) => void;
}

export const CaseViewObservables = ({
  caseData,
  observables,
  searchTerm,
  isLoading,
  onUpdateField,
}: CaseViewObservablesProps) => {
  const caseDataWithFilteredObservables: CaseUI = useMemo(
    () => ({ ...caseData, observables }),
    [caseData, observables]
  );

  const onExtractObservablesChanged = useCallback(
    (isOn: boolean) => {
      onUpdateField({
        key: 'settings',
        value: { ...caseData.settings, extractObservables: isOn },
      });
    },
    [caseData.settings, onUpdateField]
  );

  if (searchTerm && observables.length === 0) {
    return null;
  }

  return (
    <AttachmentAccordion id="observables" title={OBSERVABLES_TAB} count={observables.length}>
      <ObservablesTable
        caseData={caseDataWithFilteredObservables}
        isLoading={isLoading}
        onExtractObservablesChanged={onExtractObservablesChanged}
      />
    </AttachmentAccordion>
  );
};

CaseViewObservables.displayName = 'CaseViewObservables';
