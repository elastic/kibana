/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { useContext, useEffect } from 'react';
import styled from 'styled-components';
import {
  EmptyState,
  MonitorList,
  OverviewPageParsingErrorCallout,
  StatusPanel,
} from '../components/functional';
import { UMUpdateBreadcrumbs } from '../lib/lib';
import { useUrlParams, useUptimeTelemetry, UptimePage } from '../hooks';
import { stringifyUrlParams } from '../lib/helper/stringify_url_params';
import { useTrackPageview } from '../../../infra/public';
import { AutocompleteProviderRegister } from '../../../../../../src/plugins/data/public';
import { PageHeader } from './page_header';
import { IIndexPattern } from '../../../../../../src/plugins/data/public';
import { UptimeThemeContext } from '../contexts';
import { FilterGroup, KueryBar } from '../components/connected';
import { useUpdateKueryString } from '../hooks';

interface OverviewPageProps {
  autocomplete: Pick<AutocompleteProviderRegister, 'getProvider'>;
  setBreadcrumbs: UMUpdateBreadcrumbs;
  indexPattern: IIndexPattern;
  setEsKueryFilters: (esFilters: string) => void;
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

export const OverviewPageComponent = ({
  autocomplete,
  setBreadcrumbs,
  indexPattern,
  setEsKueryFilters,
}: Props) => {
  const { colors } = useContext(UptimeThemeContext);
  const [getUrlParams] = useUrlParams();
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

  const [esFilters, error] = useUpdateKueryString(indexPattern, search, urlFilters);

  useEffect(() => {
    setEsKueryFilters(esFilters ?? '');
  }, [esFilters, setEsKueryFilters]);

  const sharedProps = {
    dateRangeStart,
    dateRangeEnd,
    statusFilter,
    filters: esFilters,
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
            <FilterGroup esFilters={esFilters} />
          </EuiFlexItemStyled>
          {error && <OverviewPageParsingErrorCallout error={error} />}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <StatusPanel />
        <EuiSpacer size="s" />
        <MonitorList
          dangerColor={colors.danger}
          hasActiveFilters={!!esFilters}
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
