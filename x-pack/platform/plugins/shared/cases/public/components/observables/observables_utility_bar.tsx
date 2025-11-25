/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { CaseUI } from '../../../common';
import { AddObservable } from './add_observable';
import { ExtractObservablesSwitch } from '../case_settings/extract_observables_switch';
import { DefaultObservableTypesModal } from './default_observable_types_modal';
import { useCasesFeatures } from '../../common/use_cases_features';
import { useCasesContext } from '../cases_context/use_cases_context';
import * as i18n from './translations';

export interface ObservablesUtilityBarProps {
  caseData: CaseUI;
  isLoading: boolean;
  onExtractObservablesChanged: (isOn: boolean) => void;
}

export const ObservablesUtilityBar = ({
  caseData,
  isLoading,
  onExtractObservablesChanged,
}: ObservablesUtilityBarProps) => {
  const { permissions } = useCasesContext();
  const { isExtractObservablesEnabled, observablesAuthorized } = useCasesFeatures();

  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs">
      <EuiFlexItem>
        {caseData.observables.length > 0 && (
          <EuiText size="xs" color="subdued" data-test-subj="cases-observables-table-results-count">
            {i18n.SHOWING_OBSERVABLES(caseData.observables.length)}
          </EuiText>
        )}
      </EuiFlexItem>

      {permissions.update && observablesAuthorized && isExtractObservablesEnabled ? (
        <>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="xs">
              <EuiFlexItem grow={false}>
                <ExtractObservablesSwitch
                  disabled={isLoading}
                  isEnabled={caseData.settings.extractObservables ?? false}
                  onSwitchChange={onExtractObservablesChanged}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" data-test-subj="auto-extract-observables-text">
                  <p>{i18n.EXTRACT_OBSERVABLES_LABEL}</p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <DefaultObservableTypesModal />
          </EuiFlexItem>
        </>
      ) : null}

      <EuiFlexItem grow={false}>
        <AddObservable caseData={caseData} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

ObservablesUtilityBar.displayName = 'ObservablesUtilityBar';
