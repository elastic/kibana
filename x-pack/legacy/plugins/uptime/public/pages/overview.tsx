/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { useContext } from 'react';
import styled from 'styled-components';
import {
  EmptyState,
  FilterGroup,
  MonitorList,
  OverviewPageParsingErrorCallout,
  StatusPanel,
} from '../components/functional';
import { UMUpdateBreadcrumbs } from '../lib/lib';
import { useUrlParams, useUptimeTelemetry, UptimePage } from '../hooks';
import { stringifyUrlParams } from '../lib/helper/stringify_url_params';
import { useTrackPageview } from '../../../infra/public';
import { PageHeader } from './page_header';
import { DataPublicPluginStart } from '../../../../../../src/plugins/data/public';
import { UptimeThemeContext } from '../contexts';
import { KueryBar } from '../components/connected';
import { useUpdateKueryString } from '../hooks';

interface OverviewPageProps {
  autocomplete: DataPublicPluginStart['autocomplete'];
  setBreadcrumbs: UMUpdateBreadcrumbs;
  indexPattern: any;
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

export const OverviewPageComponent = ({ autocomplete, setBreadcrumbs, indexPattern }: Props) => {
  const { colors } = useContext(UptimeThemeContext);
  const [getUrlParams, updateUrl] = useUrlParams();
  const { absoluteDateRangeStart, absoluteDateRangeEnd, ...params } = getUrlParams();
  const {
    dateRangeStart,
    dateRangeEnd,
    pagination,
    statusFilter,
    search,
    filters: urlFilters,
  } = params;

  useUptimeTelemetry(UptimePage.Overview);

  useTrackPageview({ app: 'uptime', path: 'overview' });
  useTrackPageview({ app: 'uptime', path: 'overview', delay: 15000 });

  const [filters, error] = useUpdateKueryString(indexPattern, search, urlFilters);

  const sharedProps = {
    dateRangeStart,
    dateRangeEnd,
    filters,
    statusFilter,
  };

  const linkParameters = stringifyUrlParams(params, true);

  return (
    <>
      <PageHeader setBreadcrumbs={setBreadcrumbs} />
      <EmptyState implementsCustomErrorState={true} variables={{}}>
        <EuiFlexGroup gutterSize="xs" wrap responsive>
          <EuiFlexItem grow={1} style={{ flexBasis: 500 }}>
            <KueryBar autocomplete={autocomplete} />
          </EuiFlexItem>
          <EuiFlexItemStyled grow={true}>
            <FilterGroup
              {...sharedProps}
              currentFilter={filters}
              onFilterUpdate={(filtersKuery: string) => {
                if (filters !== filtersKuery) {
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
    </>
  );
};
