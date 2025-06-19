/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiDataGridColumn } from '@elastic/eui';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiLoadingChart } from '@elastic/eui';
import type { RuleTypeSolution } from '@kbn/alerting-types';
import type { TimeRange } from '@kbn/es-query';
import { alertsFiltersToEsQuery } from '@kbn/response-ops-alerts-filters-form/utils/filters';
import { getRuleTypeIdsForSolution } from '@kbn/response-ops-alerts-filters-form/utils/solutions';
import { useGetInternalRuleTypesQuery } from '@kbn/response-ops-rules-apis/hooks/use_get_internal_rule_types_query';
import { getTime } from '@kbn/data-plugin/common';
import { AlertsTable } from '@kbn/response-ops-alerts-table';
import { AlertActionsCell } from '@kbn/response-ops-alerts-table/components/alert_actions_cell';
import { ALERT_TIME_RANGE, TIMESTAMP } from '@kbn/rule-data-utils';
import type { AlertsTableProps } from '@kbn/response-ops-alerts-table/types';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { defaultAlertsTableColumns } from '@kbn/response-ops-alerts-table/configuration';
import type { JsonObject } from '@kbn/utility-types';
import {
  CONFIG_EDITOR_KQL_ERROR_TOAST_TITLE,
  getSolutionRuleTypesAuthPromptBody,
  NO_AUTHORIZED_RULE_TYPE_PROMPT_TITLE,
  RULE_TYPES_LOAD_ERROR_DESCRIPTION,
  RULE_TYPES_LOAD_ERROR_TITLE,
} from '../translations';
import type { EmbeddableAlertsTableQuery } from '../types';
import { NO_AUTHORIZED_RULE_TYPE_PROMPT_SUBJ } from '../constants';
import { InMemoryStorage } from '../utils/in_memory_storage';

export interface EmbeddableAlertsTableProps {
  id: string;
  timeRange?: TimeRange;
  solution?: RuleTypeSolution;
  query?: EmbeddableAlertsTableQuery;
  services: AlertsTableProps['services'];
}

const inMemoryStorage = new InMemoryStorage();
const columns = defaultAlertsTableColumns.map<EuiDataGridColumn>((column) => ({
  ...column,
  actions: false,
  isResizable: false,
  isSortable: false,
  cellActions: [],
}));

/**
 * Renders the AlertsTable based on the embeddable table config
 */
export const EmbeddableAlertsTable = ({
  id,
  timeRange,
  solution,
  query,
  services,
}: EmbeddableAlertsTableProps) => {
  const {
    data: ruleTypes,
    isLoading: isLoadingRuleTypes,
    isError: cannotLoadRuleTypes,
  } = useGetInternalRuleTypesQuery({ http: services.http });
  const ruleTypeIds = useMemo(
    () => (!ruleTypes || !solution ? [] : getRuleTypeIdsForSolution(ruleTypes, solution)),
    [ruleTypes, solution]
  );
  const timeRangeQuery: QueryDslQueryContainer | null = timeRange
    ? {
        bool: {
          minimum_should_match: 1,
          should: [
            getTime(undefined, timeRange, {
              fieldName: ALERT_TIME_RANGE,
            })!.query,
            getTime(undefined, timeRange, {
              fieldName: TIMESTAMP,
            })!.query,
          ],
        },
      }
    : null;
  const filtersQuery = useMemo(() => {
    let filters: JsonObject | null = null;
    try {
      if (query?.filters) {
        filters = alertsFiltersToEsQuery(query.filters);
      }
    } catch (e) {
      services.notifications.toasts.addError(e, { title: CONFIG_EDITOR_KQL_ERROR_TOAST_TITLE });
    }
    return filters;
  }, [query?.filters, services.notifications.toasts]);
  const finalQuery = {
    bool: {
      must: [timeRangeQuery, filtersQuery].filter(Boolean) as QueryDslQueryContainer[],
    },
  };

  if (isLoadingRuleTypes) {
    // Using EuiLoadingChart instead of EuiLoadingSpinner to match the
    // dashboard panel loading indicator
    return (
      <EuiFlexGroup alignItems="center" justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingChart size="l" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (cannotLoadRuleTypes) {
    // If rule types are not available, we cannot forward their ids to the table for authorization
    return (
      <EuiEmptyPrompt
        title={<h2>{RULE_TYPES_LOAD_ERROR_TITLE}</h2>}
        body={<p>{RULE_TYPES_LOAD_ERROR_DESCRIPTION}</p>}
        color="danger"
        iconType="error"
      />
    );
  }

  if (solution && !ruleTypeIds.length) {
    return (
      <EuiEmptyPrompt
        title={<h2>{NO_AUTHORIZED_RULE_TYPE_PROMPT_TITLE}</h2>}
        body={<p>{getSolutionRuleTypesAuthPromptBody(solution)}</p>}
        iconType="securityApp"
        data-test-subj={NO_AUTHORIZED_RULE_TYPE_PROMPT_SUBJ}
      />
    );
  }

  return (
    <AlertsTable
      id={id}
      ruleTypeIds={ruleTypeIds}
      query={finalQuery}
      columns={columns}
      showAlertStatusWithFlapping
      renderActionsCell={AlertActionsCell}
      toolbarVisibility={{
        // Disabling the fullscreen toggle since it breaks in Dashboards
        // and panels can be maximized on their own
        showFullScreenSelector: false,
        // Disable data grid customizations
        showColumnSelector: false,
        showSortSelector: false,
        showKeyboardShortcuts: false,
        showDisplaySelector: false,
      }}
      emptyState={{
        height: 'flex',
        variant: 'transparent',
      }}
      openLinksInNewTab={true}
      flyoutOwnsFocus={true}
      flyoutPagination={false}
      // Saves the configuration in memory in case we want to add a shared configuration saved in
      // the panel config in the future (and avoid localStorage migrations or deletions tasks)
      configurationStorage={inMemoryStorage}
      // Disable columns customziation
      browserFields={{}}
      services={services}
    />
  );
};
