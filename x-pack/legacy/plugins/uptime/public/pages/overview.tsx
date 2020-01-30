/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { Fragment, useContext, useState } from 'react';
import styled from 'styled-components';
import {
  EmptyState,
  FilterGroup,
  KueryBar,
  MonitorList,
  OverviewPageParsingErrorCallout,
  StatusPanel,
} from '../components/functional';
import { UMUpdateBreadcrumbs } from '../lib/lib';
import { useIndexPattern, useUrlParams, useUptimeTelemetry, UptimePage } from '../hooks';
import { stringifyUrlParams } from '../lib/helper/stringify_url_params';
import { useTrackPageview } from '../../../infra/public';
import { combineFiltersAndUserSearch, stringifyKueries, toStaticIndexPattern } from '../lib/helper';
import { store } from '../state';
import { setEsKueryString } from '../state/actions';
import { PageHeader } from './page_header';
import { esKuery, DataPublicPluginStart } from '../../../../../../src/plugins/data/public';
import { UptimeThemeContext } from '../contexts/uptime_theme_context';

interface OverviewPageProps {
  autocomplete: DataPublicPluginStart['autocomplete'];
  setBreadcrumbs: UMUpdateBreadcrumbs;
}

type Props = OverviewPageProps;

const EuiFlexItemStyled = styled(EuiFlexItem)`
  && {
    min-width: 598px;
    @media only screen and (max-width: 630px) {
      min-width: initial;
    }
  }
`;

export const OverviewPage = ({ autocomplete, setBreadcrumbs }: Props) => {
  const { colors } = useContext(UptimeThemeContext);
  const [getUrlParams, updateUrl] = useUrlParams();
  const { absoluteDateRangeStart, absoluteDateRangeEnd, ...params } = getUrlParams();
  const {
    dateRangeStart,
    dateRangeEnd,
    search,
    pagination,
    statusFilter,
    filters: urlFilters,
  } = params;
  const [indexPattern, setIndexPattern] = useState<any>(undefined);
  useUptimeTelemetry(UptimePage.Overview);
  useIndexPattern(setIndexPattern);

  useTrackPageview({ app: 'uptime', path: 'overview' });
  useTrackPageview({ app: 'uptime', path: 'overview', delay: 15000 });

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

  const filterQueryString = search || '';
  let filters: any | undefined;
  try {
    if (filterQueryString || urlFilters) {
      if (indexPattern) {
        const staticIndexPattern = toStaticIndexPattern(indexPattern);
        const combinedFilterString = combineFiltersAndUserSearch(filterQueryString, kueryString);
        const ast = esKuery.fromKueryExpression(combinedFilterString);
        const elasticsearchQuery = esKuery.toElasticsearchQuery(ast, staticIndexPattern);
        filters = JSON.stringify(elasticsearchQuery);
        const searchDSL: string = filterQueryString
          ? JSON.stringify(
              esKuery.toElasticsearchQuery(
                esKuery.fromKueryExpression(filterQueryString),
                staticIndexPattern
              )
            )
          : '';
        store.dispatch(setEsKueryString(searchDSL));
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

  const linkParameters = stringifyUrlParams(params, true);

  return (
    <Fragment>
      <PageHeader setBreadcrumbs={setBreadcrumbs} />
      <EmptyState implementsCustomErrorState={true} variables={{}}>
        <EuiFlexGroup gutterSize="xs" wrap responsive>
          <EuiFlexItem grow={1} style={{ flexBasis: 500 }}>
            <KueryBar autocomplete={autocomplete} />
          </EuiFlexItem>
          <EuiFlexItemStyled grow={true}>
            <FilterGroup
              {...sharedProps}
              currentFilter={urlFilters}
              onFilterUpdate={(filtersKuery: string) => {
                if (urlFilters !== filtersKuery) {
                  updateUrl({ filters: filtersKuery, pagination: '' });
                }
              }}
            />
          </EuiFlexItemStyled>
          {error && <OverviewPageParsingErrorCallout error={error} />}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <StatusPanel
          absoluteDateRangeStart={absoluteDateRangeStart}
          absoluteDateRangeEnd={absoluteDateRangeEnd}
          dateRangeStart={dateRangeStart}
          dateRangeEnd={dateRangeEnd}
          filters={filters}
          statusFilter={statusFilter}
        />
        <EuiSpacer size="s" />
        <MonitorList
          absoluteStartDate={absoluteDateRangeStart}
          absoluteEndDate={absoluteDateRangeEnd}
          dangerColor={colors.danger}
          hasActiveFilters={!!filters}
          implementsCustomErrorState={true}
          linkParameters={linkParameters}
          successColor={colors.success}
          variables={{
            ...sharedProps,
            pagination,
          }}
        />
      </EmptyState>
    </Fragment>
  );
};
