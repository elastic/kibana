/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSpacer,
  EuiPanel
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { useTransactionBreakdown } from '../../../hooks/useTransactionBreakdown';
import { TransactionBreakdownHeader } from './TransactionBreakdownHeader';
import { TransactionBreakdownKpiList } from './TransactionBreakdownKpiList';
import { TransactionBreakdownGraph } from './TransactionBreakdownGraph';
import { trackEvent } from '../../../../../infra/public/hooks/use_track_metric';

const NoTransactionsTitle = styled.span`
  font-weight: bold;
`;

const TransactionBreakdown: React.FC<{
  initialIsOpen?: boolean;
}> = ({ initialIsOpen }) => {
  const [showChart, setShowChart] = useState(!!initialIsOpen);

  const {
    data,
    status,
    receivedDataDuringLifetime
  } = useTransactionBreakdown();

  const { kpis, timeseries } = data;

  const hasHits = kpis.length > 0;

  if (!receivedDataDuringLifetime) {
    return null;
  }

  return (
    <EuiPanel>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem grow={false}>
          <TransactionBreakdownHeader
            showChart={showChart}
            hideShowChartButton={!hasHits}
            onToggleClick={() => {
              setShowChart(!showChart);
              if (showChart) {
                trackEvent({ app: 'apm', name: 'hide_breakdown_chart' });
              } else {
                trackEvent({ app: 'apm', name: 'show_breakdown_chart' });
              }
            }}
          />
        </EuiFlexItem>
        {hasHits ? (
          <EuiFlexItem grow={false}>
            <TransactionBreakdownKpiList kpis={kpis} />
          </EuiFlexItem>
        ) : (
          status === 'success' && (
            <>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup justifyContent="center">
                  <EuiFlexItem grow={false}>
                    <EuiText>
                      <NoTransactionsTitle>
                        {i18n.translate(
                          'xpack.apm.transactionBreakdown.noTransactionsTitle',
                          {
                            defaultMessage: 'No transactions were found.'
                          }
                        )}
                      </NoTransactionsTitle>
                      {' ' +
                        i18n.translate(
                          'xpack.apm.transactionBreakdown.noTransactionsTip',
                          {
                            defaultMessage:
                              'Try another time range or reset the filter.'
                          }
                        )}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiSpacer size="m" />
            </>
          )
        )}
        {showChart && hasHits ? (
          <EuiFlexItem grow={false}>
            <TransactionBreakdownGraph timeseries={timeseries} />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export { TransactionBreakdown };
