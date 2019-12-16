/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { Fragment, useContext, useEffect, useState } from 'react';
import styled from 'styled-components';
import { getOverviewPageBreadcrumbs } from '../breadcrumbs';
import {
  EmptyState,
  FilterGroup,
  KueryBar,
  MonitorList,
  OverviewPageParsingErrorCallout,
  StatusPanel,
} from '../components/functional';
import { UMUpdateBreadcrumbs } from '../lib/lib';
import { UptimeSettingsContext } from '../contexts';
import { useUrlParams } from '../hooks';
import { stringifyUrlParams } from '../lib/helper/stringify_url_params';
import { useTrackPageview } from '../../../infra/public';
import { getIndexPattern } from '../lib/adapters/index_pattern';
import { combineFiltersAndUserSearch, stringifyKueries, toStaticIndexPattern } from '../lib/helper';
import { AutocompleteProviderRegister, esKuery } from '../../../../../../src/plugins/data/public';
import { store } from '../state';
import { setEsKueryString } from '../state/actions';

interface OverviewPageProps {
  basePath: string;
  autocomplete: Pick<AutocompleteProviderRegister, 'getProvider'>;
  history: any;
  location: {
    pathname: string;
    search: string;
  };
  logOverviewPageLoad: () => void;
  setBreadcrumbs: UMUpdateBreadcrumbs;
}

type Props = OverviewPageProps;

export type UptimeSearchBarQueryChangeHandler = (queryChangedEvent: {
  query?: { text: string };
  queryText?: string;
}) => void;

const EuiFlexItemStyled = styled(EuiFlexItem)`
  && {
    min-width: 598px;
    @media only screen and (max-width: 630px) {
      min-width: initial;
    }
  }
`;

export const OverviewPage = ({
  basePath,
  autocomplete,
  logOverviewPageLoad,
  setBreadcrumbs,
}: Props) => {
  const { colors, setHeadingText } = useContext(UptimeSettingsContext);
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
        if (filterQueryString) {
          store.dispatch(
            setEsKueryString(
              JSON.stringify(
                esKuery.toElasticsearchQuery(
                  esKuery.fromKueryExpression(filterQueryString),
                  staticIndexPattern
                )
              )
            )
          );
        } else {
          store.dispatch(setEsKueryString(''));
        }
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

  return (
    <Fragment>
      <EmptyState basePath={basePath} implementsCustomErrorState={true} variables={{}}>
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
          sharedProps={sharedProps}
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
