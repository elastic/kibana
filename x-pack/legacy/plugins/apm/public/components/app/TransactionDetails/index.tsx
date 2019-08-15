/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem
} from '@elastic/eui';
import _ from 'lodash';
import React, { useMemo } from 'react';
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
import { useTrackPageview } from '../../../../../infra/public';
import { PROJECTION } from '../../../../common/projections/typings';
import { LocalUIFilters } from '../../shared/LocalUIFilters';

export function TransactionDetails() {
  const location = useLocation();
  const { urlParams } = useUrlParams();
  const {
    data: distributionData,
    status: distributionStatus
  } = useTransactionDistribution(urlParams);

  const { data: transactionChartsData } = useTransactionCharts();

  const { data: waterfall, exceedsMax } = useWaterfall(urlParams);
  const transaction = waterfall.getTransactionById(urlParams.transactionId);

  const { transactionName, transactionType, serviceName } = urlParams;

  useTrackPageview({ app: 'apm', path: 'transaction_details' });
  useTrackPageview({ app: 'apm', path: 'transaction_details', delay: 15000 });

  const localUIFiltersConfig = useMemo(() => {
    const config: React.ComponentProps<typeof LocalUIFilters> = {
      filterNames: ['transactionResult'],
      projection: PROJECTION.TRANSACTIONS,
      params: {
        transactionName,
        transactionType,
        serviceName
      }
    };
    return config;
  }, [transactionName, transactionType, serviceName]);

  return (
    <div>
      <ApmHeader>
        <EuiTitle size="l">
          <h1>{transactionName}</h1>
        </EuiTitle>
      </ApmHeader>

      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <LocalUIFilters {...localUIFiltersConfig} />
        </EuiFlexItem>
        <EuiFlexItem grow={7}>
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
              exceedsMax={exceedsMax}
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
