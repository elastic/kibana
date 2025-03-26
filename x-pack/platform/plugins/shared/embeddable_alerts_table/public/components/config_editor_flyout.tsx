/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { AlertsFiltersForm } from '@kbn/response-ops-alerts-filters-form/components/alerts_filters_form';
import { AlertsSolutionSelector } from '@kbn/response-ops-alerts-filters-form/components/alerts_solution_selector';
import { getRuleTypeIdsForSolution } from '@kbn/response-ops-alerts-filters-form/utils/get_rule_types_by_solution';
import { useGetInternalRuleTypesQuery } from '@kbn/response-ops-rules-apis/hooks/use_get_internal_rule_types_query';
import type { AlertsFiltersExpression } from '@kbn/response-ops-alerts-filters-form/types';
import type { RuleTypeSolution } from '@kbn/alerting-types';
import { isEmptyFiltersExpression } from '@kbn/response-ops-alerts-filters-form/utils/filters_expression';
import type { EmbeddableAlertsTableConfig } from '../types';
import {
  CONFIG_EDITOR_ADD_TABLE_TITLE,
  CONFIG_EDITOR_CANNOT_LOAD_RULE_TYPES_DESCRIPTION,
  CONFIG_EDITOR_CANNOT_LOAD_RULE_TYPES_TITLE,
  CONFIG_EDITOR_EDITOR_CLOSE_LABEL,
  CONFIG_EDITOR_EDITOR_SAVE_LABEL,
  CONFIG_EDITOR_EDIT_TABLE_TITLE,
  CONFIG_EDITOR_FILTERS_FORM_TITLE,
  SWITCH_SOLUTION_CONFIRM_CANCEL_MESSAGE,
  SWITCH_SOLUTION_CONFIRM_CONFIRM_MESSAGE,
  SWITCH_SOLUTION_CONFIRM_MESSAGE,
  SWITCH_SOLUTION_CONFIRM_TITLE,
} from '../translations';

export interface ConfigEditorFlyoutProps {
  initialConfig?: EmbeddableAlertsTableConfig;
  onSave: (newConfig: EmbeddableAlertsTableConfig) => void;
  onCancel: () => void;
  services: {
    http: CoreStart['http'];
    notifications: CoreStart['notifications'];
    overlays: CoreStart['overlays'];
  };
}

const EMPTY_FILTERS: AlertsFiltersExpression = {
  operator: 'and',
  operands: [{}],
};

export const ConfigEditorFlyout = ({
  initialConfig,
  onSave,
  onCancel,
  services,
}: ConfigEditorFlyoutProps) => {
  const { http, overlays } = services;
  const [solution, setSolution] = useState<EmbeddableAlertsTableConfig['solution'] | undefined>(
    initialConfig?.solution
  );
  const [filters, setFilters] = useState<EmbeddableAlertsTableConfig['filters'] | undefined>(
    initialConfig?.filters
  );
  const {
    data: ruleTypes,
    isLoading: isLoadingRuleTypes,
    isError: cannotLoadRuleTypes,
  } = useGetInternalRuleTypesQuery({ http });
  const ruleTypeIds = useMemo(
    () => (!ruleTypes || !solution ? [] : getRuleTypeIdsForSolution(ruleTypes, solution)),
    [ruleTypes, solution]
  );

  const onSolutionChange = useCallback(
    (newSolution: RuleTypeSolution) => {
      if (
        solution != null &&
        newSolution !== solution &&
        filters != null &&
        !isEmptyFiltersExpression(filters)
      ) {
        // Filters are incompatible between different solutions and thus must be reset
        // Ask for confirmation before doing so
        overlays
          .openConfirm(SWITCH_SOLUTION_CONFIRM_MESSAGE, {
            title: SWITCH_SOLUTION_CONFIRM_TITLE,
            buttonColor: 'danger',
            cancelButtonText: SWITCH_SOLUTION_CONFIRM_CANCEL_MESSAGE,
            confirmButtonText: SWITCH_SOLUTION_CONFIRM_CONFIRM_MESSAGE,
          })
          .then((result) => {
            if (result) {
              // User accepted to switch solution
              setSolution(newSolution);
              setFilters(EMPTY_FILTERS);
            }
          });
      } else {
        setSolution(newSolution);
      }
    },
    [filters, overlays, solution]
  );

  return (
    <>
      <EuiFlyoutHeader hasBorder={true}>
        <EuiTitle size="s">
          <h2>{!initialConfig ? CONFIG_EDITOR_ADD_TABLE_TITLE : CONFIG_EDITOR_EDIT_TABLE_TITLE}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem>
            <AlertsSolutionSelector
              services={{ http }}
              solution={solution}
              onSolutionChange={onSolutionChange}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem>
                <EuiText>
                  <h4>{CONFIG_EDITOR_FILTERS_FORM_TITLE}</h4>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                {isLoadingRuleTypes ? (
                  <EuiLoadingSpinner size="m" />
                ) : cannotLoadRuleTypes ? (
                  <EuiCallOut
                    color="danger"
                    iconType="error"
                    title={CONFIG_EDITOR_CANNOT_LOAD_RULE_TYPES_TITLE}
                  >
                    <p>{CONFIG_EDITOR_CANNOT_LOAD_RULE_TYPES_DESCRIPTION}</p>
                  </EuiCallOut>
                ) : (
                  <AlertsFiltersForm
                    ruleTypeIds={ruleTypeIds}
                    value={filters}
                    onChange={setFilters}
                    isDisabled={!solution}
                    services={services}
                  />
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onCancel} flush="left">
              {CONFIG_EDITOR_EDITOR_CLOSE_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              isDisabled={!solution || !filters || cannotLoadRuleTypes}
              onClick={() =>
                onSave({
                  solution: solution!,
                  filters: filters!,
                })
              }
              fill
            >
              {CONFIG_EDITOR_EDITOR_SAVE_LABEL}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
