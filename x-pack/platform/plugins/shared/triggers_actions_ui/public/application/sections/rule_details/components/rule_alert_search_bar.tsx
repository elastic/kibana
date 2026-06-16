/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { BoolQuery, Filter } from '@kbn/es-query';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { FilterGroupHandler } from '@kbn/alerts-ui-shared/src/alert_filter_controls/types';
import { UrlSyncedAlertsSearchBar } from '../../alerts_search_bar/url_synced_alerts_search_bar';
import {
  RULE_DETAILS_ALERTS_SEARCH_BAR_PARAMS_URL_STORAGE_KEY,
  RULE_DETAILS_FILTER_CONTROLS,
  RULE_DETAILS_FILTER_CONTROLS_STORAGE_KEY,
} from '../../alerts_search_bar/constants';
import {
  alertSearchBarStateContainer,
  Provider,
} from '../../alerts_search_bar/use_alert_search_bar_state_container';

interface RuleAlertSearchBarProps {
  ruleTypeId: string;
  filterControls?: Filter[];
  onFilterControlsChange: (filterControls: Filter[]) => void;
  onControlApiAvailable: (controlGroupHandler: FilterGroupHandler | undefined) => void;
  onEsQueryChange: (esQuery: { bool: BoolQuery }) => void;
}

export const RuleAlertSearchBar = ({
  ruleTypeId,
  filterControls,
  onFilterControlsChange,
  onControlApiAvailable,
  onEsQueryChange,
}: RuleAlertSearchBarProps) => {
  return (
    <Provider value={alertSearchBarStateContainer}>
      <EuiFlexGroup
        gutterSize="m"
        alignItems="center"
        data-test-subj="ruleDetailsAlertsSearchBarRow"
      >
        <EuiFlexItem>
          <UrlSyncedAlertsSearchBar
            appName="StackRuleDetailsAlerts"
            ruleTypeIds={[ruleTypeId]}
            showFilterBar
            showFilterControls
            showDatePicker
            showSubmitButton
            urlStorageKey={RULE_DETAILS_ALERTS_SEARCH_BAR_PARAMS_URL_STORAGE_KEY}
            filterControlsStorageKey={RULE_DETAILS_FILTER_CONTROLS_STORAGE_KEY}
            filterControls={filterControls}
            onFilterControlsChange={onFilterControlsChange}
            onControlApiAvailable={onControlApiAvailable}
            onEsQueryChange={onEsQueryChange}
            defaultFilterControls={RULE_DETAILS_FILTER_CONTROLS}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </Provider>
  );
};
