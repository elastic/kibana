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
  ErrorList,
  FilterBar,
  MonitorList,
  Snapshot,
  SnapshotHistogram,
} from '../components/functional';
import { UMUpdateBreadcrumbs } from '../lib/lib';
import { UptimeSettingsContext } from '../contexts';
import { useUrlParams } from '../hooks';
import { stringifyUrlParams } from '../lib/helper/stringify_url_params';

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

export type UptimeSearchBarQueryChangeHandler = (
  queryChangedEvent: { query?: { text: string }; queryText?: string }
) => void;

export const OverviewPage = ({
  basePath,
  logOverviewPageLoad,
  setBreadcrumbs,
  history,
  location,
}: Props) => {
  const { absoluteStartDate, absoluteEndDate, colors, refreshApp, setHeadingText } = useContext(
    UptimeSettingsContext
  );
  const [params, updateUrl] = useUrlParams(history, location);
  const { dateRangeStart, dateRangeEnd, search } = params;

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

  return (
    <Fragment>
      <EmptyState basePath={basePath} implementsCustomErrorState={true} variables={sharedProps}>
        <FilterBar
          currentQuery={filterQueryString}
          error={error}
          updateQuery={updateQuery}
          variables={sharedProps}
        />
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={4}>
            <Snapshot
              absoluteStartDate={absoluteStartDate}
              absoluteEndDate={absoluteEndDate}
              colors={colors}
              variables={sharedProps}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={8}>
            <SnapshotHistogram
              absoluteStartDate={absoluteStartDate}
              absoluteEndDate={absoluteEndDate}
              successColor={colors.success}
              dangerColor={colors.danger}
              variables={sharedProps}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <MonitorList
          absoluteStartDate={absoluteStartDate}
          absoluteEndDate={absoluteEndDate}
          basePath={basePath}
          dangerColor={colors.danger}
          dateRangeStart={dateRangeStart}
          dateRangeEnd={dateRangeEnd}
          linkParameters={linkParameters}
          variables={sharedProps}
        />
        <EuiSpacer size="s" />
        <ErrorList linkParameters={linkParameters} variables={sharedProps} />
      </EmptyState>
    </Fragment>
  );
};
