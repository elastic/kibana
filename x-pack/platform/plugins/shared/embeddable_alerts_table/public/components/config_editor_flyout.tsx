/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiTitle,
} from '@elastic/eui';
import type { AlertsFiltersFormProps } from '@kbn/response-ops-alerts-filters-form/components/alerts_filters_form';
import { AlertsFiltersForm } from '@kbn/response-ops-alerts-filters-form/components/alerts_filters_form';
import { AlertsSolutionSelector } from '@kbn/response-ops-alerts-filters-form/components/alerts_solution_selector';
import { isEmptyExpression, isFilter } from '@kbn/response-ops-alerts-filters-form/utils/filters';
import {
  getAvailableSolutions,
  getRuleTypeIdsForSolution,
} from '@kbn/response-ops-alerts-filters-form/utils/solutions';
import { useGetInternalRuleTypesQuery } from '@kbn/response-ops-rules-apis/hooks/use_get_internal_rule_types_query';
import type {
  AlertsFiltersExpression,
  AlertsFiltersExpressionErrors,
} from '@kbn/response-ops-alerts-filters-form/types';
import type { RuleTypeSolution } from '@kbn/alerting-types';
import type { EuiSuperSelect } from '@elastic/eui/src/components/form/super_select/super_select';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import {
  FILTER_TYPE_REQUIRED_ERROR_MESSAGE,
  FILTER_VALUE_REQUIRED_ERROR_MESSAGE,
} from '@kbn/response-ops-alerts-filters-form/translations';
import { getFilterMetadata } from '@kbn/response-ops-alerts-filters-form/filters_metadata';
import { SAVE_CONFIG_BUTTON_SUBJ } from '../constants';
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
  CONFIG_EDITOR_CLEAR_FILTERS_LABEL,
  CONFIG_EDITOR_PANEL_DESCRIPTION,
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

const EMPTY_FILTERS: AlertsFiltersExpression = [{ filter: {} }];

const computeFiltersErrors = (
  expression: AlertsFiltersExpression
): AlertsFiltersExpressionErrors => {
  return expression?.map((item) => {
    if (!isFilter(item)) {
      return undefined;
    }

    if (!item.filter.type && expression.length > 1) {
      // The user can leave the default filter empty if it's the only one
      return { type: FILTER_TYPE_REQUIRED_ERROR_MESSAGE };
    }

    if (item.filter.type) {
      const { isEmpty } = getFilterMetadata(item.filter.type);
      if (isEmpty(item.filter.value)) {
        return { value: FILTER_VALUE_REQUIRED_ERROR_MESSAGE };
      }
    }
  });
};

export const ConfigEditorFlyout = ({
  initialConfig,
  onSave,
  onCancel,
  services,
}: ConfigEditorFlyoutProps) => {
  const { http, overlays } = services;
  const flyoutBodyRef = useRef<HTMLDivElement>(null);
  const solutionSelectorRef = useRef<EuiSuperSelect<RuleTypeSolution>>(null);
  const [filters, setFilters] = useState<
    EmbeddableAlertsTableConfig['query']['filters'] | undefined
  >(initialConfig?.query?.filters ?? EMPTY_FILTERS);
  const {
    data: ruleTypes,
    isLoading: isLoadingRuleTypes,
    isError: cannotLoadRuleTypes,
  } = useGetInternalRuleTypesQuery({ http });
  const availableSolutions = useMemo(
    () => (ruleTypes ? getAvailableSolutions(ruleTypes) : undefined),
    [ruleTypes]
  );
  const [solution, setSolution] = useState<EmbeddableAlertsTableConfig['solution'] | undefined>(
    initialConfig?.solution ??
      (availableSolutions && availableSolutions.length === 1 ? availableSolutions[0] : undefined)
  );
  const ruleTypeIds = useMemo(
    () => (!ruleTypes || !solution ? [] : getRuleTypeIdsForSolution(ruleTypes, solution)),
    [ruleTypes, solution]
  );
  const [filtersErrors, setFiltersErrors] = useState<AlertsFiltersExpressionErrors>([]);

  const validateFilters = useCallback(() => {
    const errors = filters ? computeFiltersErrors(filters) : [];
    setFiltersErrors(errors);
    return !Boolean(errors?.some((error) => error));
  }, [filters]);

  const handleFiltersChange: AlertsFiltersFormProps['onChange'] = (newFilters) => {
    setFiltersErrors([]);
    setFilters(newFilters);
  };

  const resetFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
  }, []);

  const onSolutionChange = useCallback(
    (newSolution: RuleTypeSolution) => {
      if (
        solution != null &&
        newSolution !== solution &&
        filters != null &&
        !isEmptyExpression(filters)
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
              resetFilters();
            }
          });
      } else {
        setSolution(newSolution);
      }
    },
    [filters, overlays, resetFilters, solution]
  );

  useEffectOnce(() => {
    if (!solution && flyoutBodyRef.current) {
      const panel = flyoutBodyRef.current.closest('.euiFlyout');
      // Waiting for the flyuot entry animation to finish before auto-opening the solution
      // selector, otherwise the options popover cannot position itself correctly
      panel?.addEventListener('animationend', () => solutionSelectorRef.current?.openPopover(), {
        once: true,
      });
      return () => panel?.removeEventListener('animationend', focus);
    }
  });

  return (
    <>
      <EuiFlyoutHeader hasBorder={true}>
        <EuiTitle size="s">
          <h2>{!initialConfig ? CONFIG_EDITOR_ADD_TABLE_TITLE : CONFIG_EDITOR_EDIT_TABLE_TITLE}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFlexGroup direction="column" gutterSize="m" ref={flyoutBodyRef}>
          <EuiFlexItem>
            <p>{CONFIG_EDITOR_PANEL_DESCRIPTION}</p>
          </EuiFlexItem>
          <EuiFlexItem>
            {availableSolutions && availableSolutions.length > 1 && (
              <AlertsSolutionSelector
                ref={solutionSelectorRef}
                availableSolutions={availableSolutions}
                isLoading={isLoadingRuleTypes}
                isError={cannotLoadRuleTypes}
                solution={solution}
                onSolutionChange={onSolutionChange}
              />
            )}
          </EuiFlexItem>
          {solution && (
            <EuiFlexItem>
              <EuiFlexGroup direction="column" gutterSize="s">
                <EuiFlexItem>
                  <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiTitle size="xs">
                        <h4>{CONFIG_EDITOR_FILTERS_FORM_TITLE}</h4>
                      </EuiTitle>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        onClick={resetFilters}
                        iconType="eraser"
                        flush="right"
                        size="xs"
                      >
                        {CONFIG_EDITOR_CLEAR_FILTERS_LABEL}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiHorizontalRule margin="xs" />
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
                      errors={filtersErrors}
                      onChange={handleFiltersChange}
                      services={services}
                    />
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
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
              isDisabled={!solution || cannotLoadRuleTypes}
              onClick={() => {
                if (validateFilters()) {
                  onSave({
                    solution: solution!,
                    query: { type: 'alertsFilters', filters: filters! },
                  });
                }
              }}
              fill
              data-test-subj={SAVE_CONFIG_BUTTON_SUBJ}
            >
              {CONFIG_EDITOR_EDITOR_SAVE_LABEL}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
