/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiSpacer, EuiTitle, EuiHorizontalRule } from '@elastic/eui';
import _ from 'lodash';
import React from 'react';
import { useTransactionCharts } from '../../../hooks/useTransactionCharts';
import { useTransactionDistribution } from '../../../hooks/useTransactionDistribution';
import { useWaterfall } from '../../../hooks/useWaterfall';
import { TransactionCharts } from '../../shared/charts/TransactionCharts';
import { ApmHeader } from '../../shared/ApmHeader';
import { TransactionDistribution } from './Distribution';
import { Transaction } from './Transaction';
import { useLocation } from '../../../hooks/useLocation';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { FETCH_STATUS } from '../../../hooks/useFetcher';
import { TransactionBreakdown } from '../../shared/TransactionBreakdown';
import { ChartsSyncContextProvider } from '../../../context/ChartsSyncContext';

export function TransactionDetails() {
  const location = useLocation();
  const { urlParams } = useUrlParams();
  const {
    data: distributionData,
    status: distributionStatus
  } = useTransactionDistribution(urlParams);

  const { data: transactionChartsData } = useTransactionCharts();

  const { data: waterfall } = useWaterfall(urlParams);
  const transaction = waterfall.getTransactionById(urlParams.transactionId);

  const { transactionName } = urlParams;

  return (
    <div>
      <ApmHeader>
        <EuiTitle size="l">
          <h1>{transactionName}</h1>
        </EuiTitle>
      </ApmHeader>

      <ChartsSyncContextProvider>
        <TransactionBreakdown />

        <EuiSpacer size="s" />

        <TransactionCharts
          hasMLJob={false}
          charts={transactionChartsData}
          urlParams={urlParams}
          location={location}
        />
      </ChartsSyncContextProvider>

      <EuiHorizontalRule size="full" margin="l" />

      <EuiPanel>
        <TransactionDistribution
          distribution={distributionData}
          isLoading={
            distributionStatus === FETCH_STATUS.LOADING ||
            distributionStatus === undefined
          }
          urlParams={urlParams}
        />
      </EuiPanel>

      <EuiSpacer size="s" />

      {transaction && (
        <Transaction
          location={location}
          transaction={transaction}
          urlParams={urlParams}
          waterfall={waterfall}
        />
      )}
    </div>
  );
}
