/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import React, { Fragment, useContext, useEffect, useState } from 'react';
import { getOverviewPageBreadcrumbs } from '../breadcrumbs';
import {
  EmptyState,
  FilterGroup,
  KueryBar,
  MonitorList,
  OverviewPageParsingErrorCallout,
  Snapshot,
  SnapshotHistogram,
} from '../components/functional';
import { UMUpdateBreadcrumbs } from '../lib/lib';
import { UptimeSettingsContext } from '../contexts';
import { useUrlParams } from '../hooks';
import { stringifyUrlParams } from '../lib/helper/stringify_url_params';
import { useTrackPageview } from '../../../infra/public';
import { getIndexPattern } from '../lib/adapters/index_pattern';
import { combineFiltersAndUserSearch, stringifyKueries, toStaticIndexPattern } from '../lib/helper';

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
    statusFilter,
  } = params;

  const [indexPattern, setIndexPattern] = useState<any>(undefined);

  useEffect(() => {
    getIndexPattern(basePath, setIndexPattern);
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
  let kueryString: string = '';
  try {
    if (urlFilters !== '') {
      const filterMap = new Map<string, Array<string | number>>(JSON.parse(urlFilters));
      kueryString = stringifyKueries(filterMap);
    }
  } catch {
    kueryString = '';
  }

  let filters: any | undefined;
  try {
    if (filterQueryString || urlFilters) {
      if (indexPattern) {
        const staticIndexPattern = toStaticIndexPattern(indexPattern);
        const combinedFilterString = combineFiltersAndUserSearch(filterQueryString, kueryString);
        const ast = fromKueryExpression(combinedFilterString);
        const elasticsearchQuery = toElasticsearchQuery(ast, staticIndexPattern);
        filters = JSON.stringify(elasticsearchQuery);
      }
    }
  } catch (e) {
    error = e;
  }

  const sharedProps = {
    dateRangeStart,
    dateRangeEnd,
    filters,
    statusFilter,
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
        <EuiFlexGroup gutterSize="xs">
          <EuiFlexItem>
            <KueryBar />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <FilterGroup
              currentFilter={urlFilters}
              onFilterUpdate={(filtersKuery: string) => {
                if (urlFilters !== filtersKuery) {
                  updateUrl({ filters: filtersKuery });
                }
              }}
              variables={sharedProps}
            />
          </EuiFlexItem>
          {error && <OverviewPageParsingErrorCallout error={error} />}
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
          hasActiveFilters={!!filters}
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
