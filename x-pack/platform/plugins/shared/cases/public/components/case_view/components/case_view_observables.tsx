/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import type { CaseUI } from '../../../../common/ui/types';
import { ObservablesTable } from '../../observables/observables_table';
import type { OnUpdateFields } from '../types';
import { OBSERVABLES_TAB } from '../../user_actions/translations';
import { AttachmentAccordion } from './attachment_accordion';

export const OBSERVABLES_FILTER_ID = 'observables';

interface CaseViewObservablesProps {
  caseData: CaseUI;
  searchTerm?: string;
  isLoading: boolean;
  onUpdateField: (args: OnUpdateFields) => void;
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
}

export const CaseViewObservables = ({
  caseData,
  searchTerm,
  isLoading,
  onUpdateField,
  isOpen,
  onToggle,
}: CaseViewObservablesProps) => {
  const onExtractObservablesChanged = useCallback(
    (isOn: boolean) => {
      onUpdateField({
        key: 'settings',
        value: { ...caseData.settings, extractObservables: isOn },
      });
    },
    [caseData.settings, onUpdateField]
  );

  return (
    <AttachmentAccordion
      id="observables"
      title={OBSERVABLES_TAB}
      count={caseData.totalObservables ?? 0}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <ObservablesTable
        caseData={caseData}
        isLoading={isLoading}
        searchTerm={searchTerm}
        onExtractObservablesChanged={onExtractObservablesChanged}
      />
    </AttachmentAccordion>
  );
};

CaseViewObservables.displayName = 'CaseViewObservables';
