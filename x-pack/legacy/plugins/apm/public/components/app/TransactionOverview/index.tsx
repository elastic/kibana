/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule
} from '@elastic/eui';
import { Location } from 'history';
import { first } from 'lodash';
import React, { useMemo } from 'react';
import { useTransactionList } from '../../../hooks/useTransactionList';
import { useTransactionCharts } from '../../../hooks/useTransactionCharts';
import { IUrlParams } from '../../../context/UrlParamsContext/types';
import { TransactionCharts } from '../../shared/charts/TransactionCharts';
import { TransactionBreakdown } from '../../shared/TransactionBreakdown';
import { TransactionList } from './List';
import { useRedirect } from './useRedirect';
import { useFetcher } from '../../../hooks/useFetcher';
import { getHasMLJob } from '../../../services/rest/ml';
import { history } from '../../../utils/history';
import { useLocation } from '../../../hooks/useLocation';
import { ChartsSyncContextProvider } from '../../../context/ChartsSyncContext';
import { useTrackPageview } from '../../../../../../../plugins/observability/public';
import { fromQuery, toQuery } from '../../shared/Links/url_helpers';
import { LocalUIFilters } from '../../shared/LocalUIFilters';
import { PROJECTION } from '../../../../common/projections/typings';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { useServiceTransactionTypes } from '../../../hooks/useServiceTransactionTypes';
import { TransactionTypeFilter } from '../../shared/LocalUIFilters/TransactionTypeFilter';
import { useApmPluginContext } from '../../../hooks/useApmPluginContext';

function getRedirectLocation({
  urlParams,
  location,
  serviceTransactionTypes
}: {
  location: Location;
  urlParams: IUrlParams;
  serviceTransactionTypes: string[];
}): Location | undefined {
  const { transactionType } = urlParams;
  const firstTransactionType = first(serviceTransactionTypes);

  if (!transactionType && firstTransactionType) {
    return {
      ...location,
      search: fromQuery({
        ...toQuery(location.search),
        transactionType: firstTransactionType
      })
    };
  }
}

export function TransactionOverview() {
  const location = useLocation();
  const { urlParams } = useUrlParams();
  const { serviceName, transactionType } = urlParams;

  // TODO: fetching of transaction types should perhaps be lifted since it is needed in several places. Context?
  const serviceTransactionTypes = useServiceTransactionTypes(urlParams);

  // redirect to first transaction type
  useRedirect(
    history,
    getRedirectLocation({
      urlParams,
      location,
      serviceTransactionTypes
    })
  );

  const { data: transactionCharts } = useTransactionCharts();

  useTrackPageview({ app: 'apm', path: 'transaction_overview' });
  useTrackPageview({ app: 'apm', path: 'transaction_overview', delay: 15000 });
  const {
    data: transactionListData,
    status: transactionListStatus
  } = useTransactionList(urlParams);

  const { http } = useApmPluginContext().core;

  const { data: hasMLJob = false } = useFetcher(() => {
    if (serviceName && transactionType) {
      return getHasMLJob({ serviceName, transactionType, http });
    }
  }, [http, serviceName, transactionType]);

  const localFiltersConfig: React.ComponentProps<typeof LocalUIFilters> = useMemo(
    () => ({
      filterNames: [
        'transactionResult',
        'host',
        'containerId',
        'podName',
        'serviceVersion'
      ],
      params: {
        serviceName,
        transactionType
      },
      projection: PROJECTION.TRANSACTION_GROUPS
    }),
    [serviceName, transactionType]
  );

  // TODO: improve urlParams typings.
  // `serviceName` or `transactionType` will never be undefined here, and this check should not be needed
  if (!serviceName || !transactionType) {
    return null;
  }

  return (
    <>
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <LocalUIFilters {...localFiltersConfig}>
            <TransactionTypeFilter transactionTypes={serviceTransactionTypes} />
            <EuiSpacer size="xl" />
            <EuiHorizontalRule margin="none" />
          </LocalUIFilters>
        </EuiFlexItem>
        <EuiFlexItem grow={7}>
          <ChartsSyncContextProvider>
            <TransactionBreakdown initialIsOpen={true} />

            <EuiSpacer size="s" />

            <TransactionCharts
              hasMLJob={hasMLJob}
              charts={transactionCharts}
              location={location}
              urlParams={urlParams}
            />
          </ChartsSyncContextProvider>

          <EuiSpacer size="s" />

          <EuiPanel>
            <EuiTitle size="xs">
              <h3>Transactions</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <TransactionList
              isLoading={transactionListStatus === 'loading'}
              items={transactionListData}
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
