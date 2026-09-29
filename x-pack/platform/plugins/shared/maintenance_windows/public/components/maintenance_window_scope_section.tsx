/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { EuiSwitchEvent } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSwitch,
  EuiText,
  EuiTextColor,
  EuiSpacer,
  EuiFieldSearch,
} from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import * as i18n from '../translations';
import { MaintenanceWindowScopedQuery } from './maintenance_window_scoped_query';

export interface MaintenanceWindowScopeSectionProps {
  standardAlertingEnabled: boolean;
  onStandardAlertingEnabledChange: (enabled: boolean) => void;
  esqlAlertingEnabled: boolean;
  onEsqlAlertingEnabledChange: (enabled: boolean) => void;
  ruleTypeIds: string[];
  query: string;
  filters: Filter[];
  errors?: string[];
  isLoadingRuleTypes?: boolean;
  onQueryChange: (query: string) => void;
  onFiltersChange: (filters: Filter[]) => void;
  /** Prototype-only ES|QL filter text (not persisted). */
  esqlFilterQuery: string;
  onEsqlFilterQueryChange: (query: string) => void;
}

/**
 * Prototype Scope section: choose Kibana standard alerting and/or Kibana ES|QL alerting.
 */
export const MaintenanceWindowScopeSection = (props: MaintenanceWindowScopeSectionProps) => {
  const {
    standardAlertingEnabled,
    onStandardAlertingEnabledChange,
    esqlAlertingEnabled,
    onEsqlAlertingEnabledChange,
    ruleTypeIds,
    query,
    filters,
    errors,
    isLoadingRuleTypes,
    onQueryChange,
    onFiltersChange,
    esqlFilterQuery,
    onEsqlFilterQueryChange,
  } = props;

  const onStandardSwitchChange = useCallback(
    (event: EuiSwitchEvent) => {
      onStandardAlertingEnabledChange(event.target.checked);
    },
    [onStandardAlertingEnabledChange]
  );

  const onEsqlSwitchChange = useCallback(
    (event: EuiSwitchEvent) => {
      onEsqlAlertingEnabledChange(event.target.checked);
    },
    [onEsqlAlertingEnabledChange]
  );

  return (
    <EuiFlexGroup data-test-subj="maintenanceWindowScopeSection" direction="column" gutterSize="m">
      <EuiFlexItem>
        <EuiText size="s">
          <h4>{i18n.CREATE_FORM_SCOPE_TITLE}</h4>
          <p>
            <EuiTextColor color="subdued">{i18n.CREATE_FORM_SCOPE_DESCRIPTION}</EuiTextColor>
          </p>
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiPanel
          hasBorder
          paddingSize="m"
          data-test-subj="maintenanceWindowScopeStandardAlerting"
        >
          <EuiFlexGroup alignItems="flexStart" justifyContent="spaceBetween" gutterSize="m">
            <EuiFlexItem>
              <EuiText size="s">
                <h5>{i18n.CREATE_FORM_SCOPE_STANDARD_ALERTING_TITLE}</h5>
                <p>
                  <EuiTextColor color="subdued">
                    {i18n.CREATE_FORM_SCOPE_STANDARD_ALERTING_DESCRIPTION}
                  </EuiTextColor>
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSwitch
                label={i18n.CREATE_FORM_SCOPE_STANDARD_ALERTING_TITLE}
                showLabel={false}
                checked={standardAlertingEnabled}
                onChange={onStandardSwitchChange}
                data-test-subj="maintenanceWindowScopeStandardAlertingSwitch"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          {standardAlertingEnabled ? (
            <>
              <EuiSpacer size="m" />
              <EuiText size="xs">
                <strong>{i18n.CREATE_FORM_SCOPE_STANDARD_ALERTING_FILTER_LABEL}</strong>
              </EuiText>
              <EuiSpacer size="s" />
              <MaintenanceWindowScopedQuery
                ruleTypeIds={ruleTypeIds}
                query={query}
                filters={filters}
                isLoading={isLoadingRuleTypes}
                isEnabled={standardAlertingEnabled}
                errors={errors}
                onQueryChange={onQueryChange}
                onFiltersChange={onFiltersChange}
              />
            </>
          ) : null}
        </EuiPanel>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiPanel hasBorder paddingSize="m" data-test-subj="maintenanceWindowScopeEsqlAlerting">
          <EuiFlexGroup alignItems="flexStart" justifyContent="spaceBetween" gutterSize="m">
            <EuiFlexItem>
              <EuiText size="s">
                <h5>{i18n.CREATE_FORM_SCOPE_ESQL_ALERTING_TITLE}</h5>
                <p>
                  <EuiTextColor color="subdued">
                    {i18n.CREATE_FORM_SCOPE_ESQL_ALERTING_DESCRIPTION}
                  </EuiTextColor>
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSwitch
                label={i18n.CREATE_FORM_SCOPE_ESQL_ALERTING_TITLE}
                showLabel={false}
                checked={esqlAlertingEnabled}
                onChange={onEsqlSwitchChange}
                data-test-subj="maintenanceWindowScopeEsqlAlertingSwitch"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          {esqlAlertingEnabled ? (
            <>
              <EuiSpacer size="m" />
              <EuiText size="xs">
                <strong>{i18n.CREATE_FORM_SCOPE_ESQL_ALERTING_FILTER_LABEL}</strong>
              </EuiText>
              <EuiSpacer size="s" />
              <EuiFieldSearch
                fullWidth
                placeholder={i18n.CREATE_FORM_SCOPE_ESQL_ALERTING_FILTER_PLACEHOLDER}
                value={esqlFilterQuery}
                onChange={(e) => onEsqlFilterQueryChange(e.target.value)}
                data-test-subj="maintenanceWindowScopeEsqlFilter"
              />
            </>
          ) : null}
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
