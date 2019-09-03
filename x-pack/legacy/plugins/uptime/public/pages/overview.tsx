/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore EuiSearchBar missing
import { EuiSearchBar, EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { Fragment, useContext, useEffect } from 'react';
import { getOverviewPageBreadcrumbs } from '../breadcrumbs';
import {
  EmptyState,
  FilterBar,
  MonitorList,
  Snapshot,
  SnapshotHistogram,
} from '../components/functional';
import { UMUpdateBreadcrumbs } from '../lib/lib';
import { UptimeSettingsContext } from '../contexts';
import { useUrlParams } from '../hooks';
import { stringifyUrlParams } from '../lib/helper/stringify_url_params';
import { useTrackPageview } from '../../../infra/public';

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

export type UptimeSearchBarQueryChangeHandler = (queryChangedEvent: {
  query?: { text: string };
  queryText?: string;
}) => void;

export const OverviewPage = ({ basePath, logOverviewPageLoad, setBreadcrumbs }: Props) => {
  const { absoluteStartDate, absoluteEndDate, colors, refreshApp, setHeadingText } = useContext(
    UptimeSettingsContext
  );
  const [getUrlParams, updateUrl] = useUrlParams();
  const params = getUrlParams();
  const {
    dateRangeStart,
    dateRangeEnd,
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
  try {
    // toESQuery will throw errors
    if (filterQueryString) {
      filters = JSON.stringify(EuiSearchBar.Query.toESQuery(filterQueryString));
    }
  } catch (e) {
    error = e;
  }
  const sharedProps = {
    dateRangeStart,
    dateRangeEnd,
    filters,
  };

  const updateQuery: UptimeSearchBarQueryChangeHandler = ({ queryText }) => {
    updateUrl({ search: queryText || '' });
    refreshApp();
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
        <FilterBar
          currentQuery={filterQueryString}
          error={error}
          updateQuery={updateQuery}
          variables={sharedProps}
        />
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
