/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiTitle
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Location } from 'history';
import { first } from 'lodash';
import React from 'react';
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
import { useTrackPageview } from '../../../../../infra/public';
import { fromQuery, toQuery } from '../../shared/Links/url_helpers';
import { useServiceTransactionTypes } from '../../../hooks/useServiceTransactionTypes';

interface Props {
  urlParams: IUrlParams;
}

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

export function TransactionOverview({ urlParams }: Props) {
  const location = useLocation();
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

  const { data: hasMLJob = false } = useFetcher(() => {
    if (serviceName && transactionType) {
      return getHasMLJob({ serviceName, transactionType });
    }
  }, [serviceName, transactionType]);

  // TODO: improve urlParams typings.
  // `serviceName` or `transactionType` will never be undefined here, and this check should not be needed
  if (!serviceName || !transactionType) {
    return null;
  }

  return (
    <React.Fragment>
      {/* TODO: This should be replaced by local filters */}
      {serviceTransactionTypes.length > 1 ? (
        <EuiFormRow
          id="transaction-type-select-row"
          label={i18n.translate(
            'xpack.apm.transactionsTable.filterByTypeLabel',
            {
              defaultMessage: 'Filter by type'
            }
          )}
        >
          <EuiSelect
            options={serviceTransactionTypes.map(type => ({
              text: `${type}`,
              value: type
            }))}
            value={transactionType}
            onChange={event => {
              history.push({
                ...location,
                pathname: `/services/${urlParams.serviceName}/transactions`,
                search: fromQuery({
                  ...toQuery(location.search),
                  transactionType: event.target.value
                })
              });
            }}
          />
        </EuiFormRow>
      ) : null}

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
    </React.Fragment>
  );
}
