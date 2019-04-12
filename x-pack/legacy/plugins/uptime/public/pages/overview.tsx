/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore EuiSearchBar missing
import { EuiSearchBar, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { Fragment, useContext, useEffect, useState } from 'react';
import { getOverviewPageBreadcrumbs } from '../breadcrumbs';
import { EmptyState, ErrorList, FilterBar, MonitorList, Snapshot } from '../components/functional';
import { UMUpdateBreadcrumbs } from '../lib/lib';
import { UptimeSettingsContext } from '../contexts';

interface OverviewPageProps {
  basePath: string;
  setBreadcrumbs: UMUpdateBreadcrumbs;
}

type Props = OverviewPageProps;

export type UptimeSearchBarQueryChangeHandler = ({ query }: { query?: { text: string } }) => void;

export const OverviewPage = ({ basePath, setBreadcrumbs }: Props) => {
  const { colors, dateRangeStart, dateRangeEnd, refreshApp, setHeadingText } = useContext(
    UptimeSettingsContext
  );
  const [currentFilterQueryObj, setFilterQueryObj] = useState<object | undefined>(undefined);
  const [currentFilterQuery, setCurrentFilterQuery] = useState<string | undefined>(undefined);

  useEffect(() => {
    setBreadcrumbs(getOverviewPageBreadcrumbs());
    if (setHeadingText) {
      setHeadingText(
        i18n.translate('xpack.uptime.overviewPage.headerText', {
          defaultMessage: 'Overview',
          description: `The text that will be displayed in the app's heading when the Overview page loads.`,
        })
      );
    }
  }, []);

  const sharedProps = { dateRangeStart, dateRangeEnd, currentFilterQuery };

  const updateQuery: UptimeSearchBarQueryChangeHandler = ({ query }) => {
    try {
      let esQuery;
      if (query && query.text) {
        esQuery = EuiSearchBar.Query.toESQuery(query);
      }
      setFilterQueryObj(query);
      setCurrentFilterQuery(esQuery ? JSON.stringify(esQuery) : esQuery);
      if (refreshApp) {
        refreshApp();
      }
    } catch (e) {
      setFilterQueryObj(undefined);
      setCurrentFilterQuery(undefined);
    }
  };

  return (
    <Fragment>
      <EmptyState basePath={basePath} implementsCustomErrorState={true} variables={sharedProps}>
        <FilterBar
          currentQuery={currentFilterQueryObj}
          updateQuery={updateQuery}
          variables={sharedProps}
        />
        <EuiSpacer size="s" />
        <Snapshot colors={colors} variables={sharedProps} />
        <EuiSpacer size="s" />
        <MonitorList dangerColor={colors.danger} variables={sharedProps} />
        <EuiSpacer size="s" />
        <ErrorList variables={sharedProps} />
      </EmptyState>
    </Fragment>
  );
};
