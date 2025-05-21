/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState, useMemo, memo } from 'react';
import { BoolQuery, Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { AlertFilterControls } from '@kbn/alerts-ui-shared/src/alert_filter_controls';
import { ControlGroupRenderer } from '@kbn/controls-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { EuiButton, EuiCallOut } from '@elastic/eui';
import { useKibana } from '../../..';
import { useAlertSearchBarStateContainer } from './use_alert_search_bar_state_container';
import {
  ALERTS_SEARCH_BAR_PARAMS_URL_STORAGE_KEY,
  RESET_FILTER_CONTROLS_TEST_SUBJ,
} from './constants';
import { AlertsSearchBarProps } from './types';
import AlertsSearchBar from './alerts_search_bar';
import { buildEsQuery } from './build_es_query';
import { ErrorBoundary } from '../common/components/error_boundary';

const INVALID_QUERY_STRING_TOAST_TITLE = i18n.translate(
  'xpack.triggersActionsUI.urlSyncedAlertsSearchBar.invalidQueryTitle',
  {
    defaultMessage: 'Invalid query string',
  }
);

const FILTER_CONTROLS_ERROR_VIEW_TITLE = i18n.translate(
  'xpack.triggersActionsUI.urlSyncedAlertsSearchBar.filterControlsErrorTitle',
  {
    defaultMessage: 'Cannot render alert filters',
  }
);

const FILTER_CONTROLS_ERROR_VIEW_DESCRIPTION = i18n.translate(
  'xpack.triggersActionsUI.urlSyncedAlertsSearchBar.filterControlsErrorDescription',
  {
    defaultMessage: 'Try resetting them to fix the issue.',
  }
);

const RESET_FILTERS_BUTTON_LABEL = i18n.translate(
  'xpack.triggersActionsUI.urlSyncedAlertsSearchBar.resetFiltersButtonLabel',
  {
    defaultMessage: 'Reset filters',
  }
);

const FilterControlsErrorView = memo(({ resetFilters }: { resetFilters: () => void }) => {
  return (
    <EuiCallOut title={FILTER_CONTROLS_ERROR_VIEW_TITLE} color="danger" iconType="error">
      <p>{FILTER_CONTROLS_ERROR_VIEW_DESCRIPTION}</p>
      <EuiButton
        onClick={resetFilters}
        color="danger"
        fill
        data-test-subj={RESET_FILTER_CONTROLS_TEST_SUBJ}
      >
        {RESET_FILTERS_BUTTON_LABEL}
      </EuiButton>
    </EuiCallOut>
  );
});

export interface UrlSyncedAlertsSearchBarProps
  extends Omit<
    AlertsSearchBarProps,
    'query' | 'rangeFrom' | 'rangeTo' | 'filters' | 'onQuerySubmit'
  > {
  showFilterControls?: boolean;
  onEsQueryChange: (esQuery: { bool: BoolQuery }) => void;
  onFilterSelected?: (filters: Filter[]) => void;
}

/**
 * An abstraction over AlertsSearchBar that syncs the query state with the url
 */
export const UrlSyncedAlertsSearchBar = ({
  ruleTypeIds,
  showFilterControls = false,
  onEsQueryChange,
  onFilterSelected,
  ...rest
}: UrlSyncedAlertsSearchBarProps) => {
  const {
    http,
    data: { query: queryService },
    notifications,
    dataViews,
    spaces,
  } = useKibana().services;
  const { toasts } = notifications;
  const {
    timefilter: { timefilter: timeFilterService },
  } = queryService;
  const [spaceId, setSpaceId] = useState<string>();

  const {
    // KQL bar query
    kuery,
    onKueryChange,
    // KQL bar filters
    filters,
    onFiltersChange,
    // Controls bar filters
    controlFilters,
    onControlFiltersChange,
    // Time range
    rangeFrom,
    onRangeFromChange,
    rangeTo,
    onRangeToChange,
    // Controls bar configuration
    filterControls,
    // Saved KQL query
    savedQuery,
    setSavedQuery,
    clearSavedQuery,
  } = useAlertSearchBarStateContainer(ALERTS_SEARCH_BAR_PARAMS_URL_STORAGE_KEY);

  useEffect(() => {
    if (spaces) {
      spaces.getActiveSpace().then((space) => setSpaceId(space.id));
    }
  }, [spaces]);

  useEffect(() => {
    try {
      onEsQueryChange(
        buildEsQuery({
          timeRange: {
            to: rangeTo,
            from: rangeFrom,
          },
          kuery,
          filters: [...filters, ...controlFilters],
        })
      );

      onFilterSelected?.(filters);
    } catch (error) {
      toasts.addError(error, {
        title: INVALID_QUERY_STRING_TOAST_TITLE,
      });
      onKueryChange('');
    }
  }, [
    controlFilters,
    filters,
    kuery,
    onEsQueryChange,
    onFilterSelected,
    onKueryChange,
    rangeFrom,
    rangeTo,
    toasts,
  ]);

  const onQueryChange = useCallback<NonNullable<AlertsSearchBarProps['onQueryChange']>>(
    ({ query, dateRange }) => {
      setSavedQuery(undefined);
      timeFilterService.setTime(dateRange);
      onKueryChange(query ?? '');
      onRangeFromChange(dateRange.from);
      onRangeToChange(dateRange.to);
    },
    [onKueryChange, onRangeFromChange, onRangeToChange, setSavedQuery, timeFilterService]
  );

  const filterControlsStorageKey = useMemo(
    () => ['alertsSearchBar', spaceId, 'filterControls'].filter(Boolean).join('.'),
    [spaceId]
  );

  const resetFilters = useCallback(() => {
    new Storage(window.localStorage).remove(filterControlsStorageKey);
    window.location.reload();
  }, [filterControlsStorageKey]);

  return (
    <>
      <AlertsSearchBar
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        query={kuery}
        onQuerySubmit={onQueryChange}
        filters={filters}
        onFiltersUpdated={onFiltersChange}
        savedQuery={savedQuery}
        onSavedQueryUpdated={setSavedQuery}
        onClearSavedQuery={clearSavedQuery}
        ruleTypeIds={ruleTypeIds}
        {...rest}
      />
      {showFilterControls && (
        <ErrorBoundary fallback={() => <FilterControlsErrorView resetFilters={resetFilters} />}>
          <AlertFilterControls
            dataViewSpec={{
              id: 'unified-alerts-dv',
              title: '.alerts-*',
            }}
            spaceId={spaceId}
            chainingSystem="HIERARCHICAL"
            controlsUrlState={filterControls}
            filters={controlFilters}
            onFiltersChange={onControlFiltersChange}
            storageKey={filterControlsStorageKey}
            ControlGroupRenderer={ControlGroupRenderer}
            services={{
              http,
              notifications,
              dataViews,
              storage: Storage,
            }}
          />
        </ErrorBoundary>
      )}
    </>
  );
};
