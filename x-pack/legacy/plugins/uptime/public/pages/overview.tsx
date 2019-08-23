/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore EuiSearchBar is not exported by EUI
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiSearchBar, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { Fragment, useContext, useEffect } from 'react';
import { getOverviewPageBreadcrumbs } from '../breadcrumbs';
import { EmptyState, MonitorList, Snapshot, SnapshotHistogram } from '../components/functional';
import { UMUpdateBreadcrumbs } from '../lib/lib';
import { UptimeSettingsContext } from '../contexts';
import { useUrlParams } from '../hooks';
import { stringifyUrlParams } from '../lib/helper/stringify_url_params';
import { useTrackPageview } from '../../../infra/public';
import { KueryBar } from '../components/functional/kuery_bar';
import { FilterDropdowns } from '../components/filter_dropdowns';

interface OverviewPageProps {
  basePath: string;
  logOverviewPageLoad: () => void;
  history: any;
  location: {
    pathname: string;
    search: string;
  };
  setBreadcrumbs: UMUpdateBreadcrumbs;
}

type Props = OverviewPageProps;

const combineFiltersAndUserSearch = (filters: string, search: string) => {
  if (!filters) return search;
  if (!search) return filters;
  return `${filters} AND ${search}`;
};

/**
 * Extract a map's keys to an array, then map those keys to a string per key.
 * The strings contain all of the values chosen for the given field (which is also the key value).
 * Reduce the list of query strings to a singular string, with AND operators between.
 */
const stringifyKueries = (kueries: Map<string, string[]>): string =>
  Array.from(kueries.keys())
    .map(key => {
      const value = kueries.get(key);
      if (!value || value.length === 0) return '';
      return value.reduce((prev, cur, index, array) => {
        const expression = `${key}:${cur}`;
        if (array.length === 1 || index === 0) {
          return expression;
        }
        return `${prev} OR ${expression}`;
      }, '');
    })
    .reduce((prev, cur, index, array) => {
      if (array.length === 1 || index === 0) {
        return cur;
      }
      return `${prev} AND ${cur}`;
    }, '');

export type UptimeSearchBarQueryChangeHandler = (queryChangedEvent: {
  query?: { text: string };
  queryText?: string;
}) => void;

export const OverviewPage = ({ basePath, logOverviewPageLoad, setBreadcrumbs }: Props) => {
  const { absoluteStartDate, absoluteEndDate, colors, setHeadingText } = useContext(
    UptimeSettingsContext
  );
  const [getUrlParams, updateUrl] = useUrlParams();
  const params = getUrlParams();
  const {
    dateRangeStart,
    dateRangeEnd,
    filters: urlFilters,
    // TODO: reintegrate pagination in future release
    // monitorListPageIndex,
    // monitorListPageSize,
    // TODO: reintegrate sorting in future release
    // monitorListSortDirection,
    // monitorListSortField,
    search,
  } = params;

  useEffect(() => {
    setBreadcrumbs(getOverviewPageBreadcrumbs());
    logOverviewPageLoad();
    if (setHeadingText) {
      setHeadingText(
        i18n.translate('xpack.uptime.overviewPage.headerText', {
          defaultMessage: 'Overview',
          description: `The text that will be displayed in the app's heading when the Overview page loads.`,
        })
      );
    }
  }, []);

  useTrackPageview({ app: 'uptime', path: 'overview' });
  useTrackPageview({ app: 'uptime', path: 'overview', delay: 15000 });

  const filterQueryString = search || '';
  let error: any;
  let filters: any | undefined;
  let kueryString: string;
  try {
    const filterMap = new Map<string, string[]>(JSON.parse(urlFilters));
    kueryString = stringifyKueries(filterMap);
  } catch {
    kueryString = '';
  }
  try {
    // toESQuery will throw errors
    if (filterQueryString || urlFilters) {
      const esQuery = combineFiltersAndUserSearch(filterQueryString, kueryString);
      if (esQuery) {
        filters = JSON.stringify(EuiSearchBar.Query.toESQuery(esQuery));
      }
    }
  } catch (e) {
    error = e;
  }

  const sharedProps = {
    dateRangeStart,
    dateRangeEnd,
    filters,
  };

  const onFilterKueryUpdate = (filtersKuery: string) => {
    if (urlFilters !== filtersKuery) {
      updateUrl({ filters: filtersKuery });
    }
  };

  const linkParameters = stringifyUrlParams(params);

  // TODO: reintroduce for pagination and sorting
  // const onMonitorListChange = ({ page: { index, size }, sort: { field, direction } }: Criteria) => {
  //   updateUrl({
  //     monitorListPageIndex: index,
  //     monitorListPageSize: size,
  //     monitorListSortDirection: direction,
  //     monitorListSortField: field,
  //   });
  // };

  return (
    <Fragment>
      <EmptyState basePath={basePath} implementsCustomErrorState={true} variables={{}}>
        <EuiFlexGroup gutterSize="none" direction="column">
          <EuiFlexItem>
            <KueryBar />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <FilterDropdowns
              currentKuery={urlFilters}
              onFilterKueryUpdate={onFilterKueryUpdate}
              variables={sharedProps}
            />
          </EuiFlexItem>
          {error && (
            <EuiCallOut title="Hello" color="danger" iconType="alert">
              <p>There was an error parsing the filter query. Error: {error}</p>
            </EuiCallOut>
          )}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={4}>
            <Snapshot variables={sharedProps} />
          </EuiFlexItem>
          <EuiFlexItem grow={8}>
            <SnapshotHistogram
              absoluteStartDate={absoluteStartDate}
              absoluteEndDate={absoluteEndDate}
              successColor={colors.success}
              dangerColor={colors.danger}
              variables={sharedProps}
              height="120px"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <MonitorList
          absoluteStartDate={absoluteStartDate}
          absoluteEndDate={absoluteEndDate}
          dangerColor={colors.danger}
          implementsCustomErrorState={true}
          linkParameters={linkParameters}
          successColor={colors.success}
          // TODO: reintegrate pagination in future release
          // pageIndex={monitorListPageIndex}
          // pageSize={monitorListPageSize}
          // TODO: reintegrate sorting in future release
          // sortDirection={monitorListSortDirection}
          // sortField={monitorListSortField}
          // TODO: reintroduce for pagination and sorting
          // onChange={onMonitorListChange}
          variables={{
            ...sharedProps,
            // TODO: reintegrate pagination in future release
            // pageIndex: monitorListPageIndex,
            // pageSize: monitorListPageSize,
            // TODO: reintegrate sorting in future release
            // sortField: monitorListSortField,
            // sortDirection: monitorListSortDirection,
          }}
        />
      </EmptyState>
    </Fragment>
  );
};
