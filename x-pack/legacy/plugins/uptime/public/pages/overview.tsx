/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { useContext, useEffect, useState } from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import {
  MonitorList,
  OverviewPageParsingErrorCallout,
  StatusPanel,
} from '../components/functional';
import { useUrlParams, useUptimeTelemetry, UptimePage } from '../hooks';
import { stringifyUrlParams } from '../lib/helper/stringify_url_params';
import { useTrackPageview } from '../../../../../plugins/observability/public';
import { DataPublicPluginSetup, IIndexPattern } from '../../../../../../src/plugins/data/public';
import { UptimeThemeContext } from '../contexts';
import { EmptyState, FilterGroup, KueryBar } from '../components/connected';
import { useUpdateKueryString } from '../hooks';
import { PageHeader } from './page_header';
import { useBreadcrumbs } from '../hooks/use_breadcrumbs';

interface OverviewPageProps {
  autocomplete: DataPublicPluginSetup['autocomplete'];
  indexPattern: IIndexPattern | null;
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

// TODO: these values belong deeper down in the monitor
// list pagination control, but are here temporarily until we
// are done removing GraphQL
const DEFAULT_PAGE_SIZE = 10;
const LOCAL_STORAGE_KEY = 'xpack.uptime.monitorList.pageSize';
const getMonitorListPageSizeValue = () => {
  const value = parseInt(localStorage.getItem(LOCAL_STORAGE_KEY) ?? '', 10);
  if (isNaN(value)) {
    return DEFAULT_PAGE_SIZE;
  }
  return value;
};

export const OverviewPageComponent = ({ autocomplete, indexPattern, setEsKueryFilters }: Props) => {
  const { colors } = useContext(UptimeThemeContext);
  const [getUrlParams] = useUrlParams();
  // TODO: this is temporary until we migrate the monitor list to our Redux implementation
  const [monitorListPageSize, setMonitorListPageSize] = useState<number>(
    getMonitorListPageSizeValue()
  );
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

  const heading = i18n.translate('xpack.uptime.overviewPage.headerText', {
    defaultMessage: 'Overview',
    description: `The text that will be displayed in the app's heading when the Overview page loads.`,
  });

  useBreadcrumbs([]); // No extra breadcrumbs on overview
  return (
    <>
      <PageHeader headingText={heading} extraLinks={true} datePicker={true} />
      <EmptyState>
        <EuiFlexGroup gutterSize="xs" wrap responsive>
          <EuiFlexItem grow={1} style={{ flexBasis: 500 }}>
            <KueryBar
              aria-label={i18n.translate('xpack.uptime.filterBar.ariaLabel', {
                defaultMessage: 'Input filter criteria for the overview page',
              })}
              autocomplete={autocomplete}
              data-test-subj="xpack.uptime.filterBar"
            />
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
          pageSize={monitorListPageSize}
          setPageSize={setMonitorListPageSize}
          successColor={colors.success}
          variables={{
            ...sharedProps,
            pagination,
            pageSize: monitorListPageSize,
          }}
        />
      </EmptyState>
    </>
  );
};
