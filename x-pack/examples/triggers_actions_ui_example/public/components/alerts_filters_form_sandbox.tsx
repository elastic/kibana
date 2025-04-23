/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { HttpStart } from '@kbn/core-http-browser';
import { NotificationsStart } from '@kbn/core-notifications-browser';
import { AlertsFiltersForm } from '@kbn/response-ops-alerts-filters-form/components/alerts_filters_form';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiPanel, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { AlertsFiltersExpression } from '@kbn/response-ops-alerts-filters-form/types';
import { useGetInternalRuleTypesQuery } from '@kbn/response-ops-rules-apis/hooks/use_get_internal_rule_types_query';
import { RuleTypeSolution } from '@kbn/alerting-types';
import { AlertsSolutionSelector } from '@kbn/response-ops-alerts-filters-form/components/alerts_solution_selector';
import { getRuleTypeIdsForSolution } from '@kbn/response-ops-alerts-filters-form/utils';

export const AlertsFiltersFormSandbox = ({
  services: { http, notifications },
}: {
  services: {
    http: HttpStart;
    notifications: NotificationsStart;
  };
}) => {
  const [solution, setSolution] = useState<RuleTypeSolution | undefined>();
  const [filters, setFilters] = useState<AlertsFiltersExpression>();
  const { data: ruleTypes, isLoading: isLoadingRuleTypes } = useGetInternalRuleTypesQuery({ http });
  const ruleTypeIds = useMemo(
    () => (!ruleTypes || !solution ? [] : getRuleTypeIdsForSolution(ruleTypes, solution)),
    [ruleTypes, solution]
  );
  const services = useMemo(
    () => ({
      http,
      notifications,
    }),
    [http, notifications]
  );

  return (
    <EuiPanel
      css={css`
        max-width: 400px;
        margin: 40px auto;
      `}
    >
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <AlertsSolutionSelector
            services={{ http }}
            solution={solution}
            onSolutionChange={(newSolution: RuleTypeSolution) => {
              if (solution != null && newSolution !== solution) {
                setFilters(undefined);
              }
              setSolution(newSolution);
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          {isLoadingRuleTypes ? (
            <EuiLoadingSpinner size="m" />
          ) : (
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem>
                <EuiText>
                  <h4>
                    <FormattedMessage id="alertsFiltersForm.formTitle" defaultMessage="Filters" />
                  </h4>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <AlertsFiltersForm
                  ruleTypeIds={ruleTypeIds}
                  value={filters}
                  onChange={setFilters}
                  isDisabled={!solution}
                  services={services}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
