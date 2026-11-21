/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import { MAX_STORED_OBSERVABLES_PER_CASE } from '../../../common/constants';
import type { CaseUI } from '../../../common';
import type { Observable } from '../../../common/types/domain/observable/v1';
import { AddObservable } from './add_observable';
import { ExtractObservablesSwitch } from '../case_settings/extract_observables_switch';
import { DefaultObservableTypesModal } from './default_observable_types_modal';
import { useCasesFeatures } from '../../common/use_cases_features';
import { useCasesContext } from '../cases_context/use_cases_context';
import { ObservablesBulkActions } from './observables_bulk_actions';
import * as i18n from './translations';

export interface ObservablesUtilityBarProps {
  caseData: CaseUI;
  /** Observables matching the current search, across every page. */
  totalObservables: number;
  isLoading: boolean;
  onExtractObservablesChanged: (isOn: boolean) => void;
  /** Currently selected observables for bulk operations. */
  selectedObservables: Observable[];
  /** Whether the current user may run workflows from this case. */
  canRunWorkflow: boolean;
  /** Clears the table selection after a successful bulk action. */
  onBulkActionSuccess?: () => void;
}

export const ObservablesUtilityBar = ({
  caseData,
  totalObservables,
  isLoading,
  onExtractObservablesChanged,
  selectedObservables,
  canRunWorkflow,
  onBulkActionSuccess,
}: ObservablesUtilityBarProps) => {
  const { permissions } = useCasesContext();
  const { isExtractObservablesEnabled, observablesAuthorized } = useCasesFeatures();
  const canUseBulkActions = canRunWorkflow || permissions.update;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs">
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
          {totalObservables > 0 && (
            <EuiFlexItem grow={false}>
              <EuiText
                size="xs"
                color="subdued"
                data-test-subj="cases-observables-table-results-count"
              >
                {i18n.SHOWING_OBSERVABLES(totalObservables)}
              </EuiText>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={i18n.OBSERVABLES_LIMIT_USAGE_TOOLTIP(MAX_STORED_OBSERVABLES_PER_CASE)}
            >
              <EuiText
                size="xs"
                color="subdued"
                tabIndex={0}
                data-test-subj="cases-observables-limit-usage"
              >
                {i18n.OBSERVABLES_LIMIT_USAGE(
                  caseData.totalObservables ?? 0,
                  MAX_STORED_OBSERVABLES_PER_CASE
                )}
              </EuiText>
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      {canUseBulkActions && (
        <ObservablesBulkActions
          caseData={caseData}
          selectedObservables={selectedObservables}
          canRunWorkflow={canRunWorkflow}
          onActionSuccess={onBulkActionSuccess}
        />
      )}

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
