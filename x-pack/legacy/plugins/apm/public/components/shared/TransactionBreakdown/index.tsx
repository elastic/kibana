/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import theme from '@elastic/eui/dist/eui_theme_light.json';
import React, { useState, useMemo } from 'react';
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
import { FETCH_STATUS } from '../../../hooks/useFetcher';

const COLORS = [
  theme.euiColorVis0,
  theme.euiColorVis1,
  theme.euiColorVis2,
  theme.euiColorVis3,
  theme.euiColorVis4,
  theme.euiColorVis5,
  theme.euiColorVis6,
  theme.euiColorVis7,
  theme.euiColorVis8,
  theme.euiColorVis9
];

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

  const kpis = data ? data.kpis : undefined;
  const timeseriesPerSubtype = data ? data.timeseries_per_subtype : undefined;

  const legends = useMemo(
    () => {
      const names = kpis ? kpis.map(kpi => kpi.name).sort() : [];

      return names.map((name, index) => {
        return {
          name,
          color: COLORS[index % COLORS.length]
        };
      });
    },
    [kpis]
  );

  const sortedAndColoredKpis = useMemo(
    () => {
      if (!kpis) {
        return null;
      }

      return legends.map(legend => {
        const { color } = legend;

        const breakdown = kpis.find(
          b => b.name === legend.name
        ) as typeof kpis[0];

        return {
          ...breakdown,
          color
        };
      });
    },
    [kpis, legends]
  );

  const loading = status === FETCH_STATUS.LOADING || status === undefined;

  const hasHits = data && data.kpis.length > 0;
  const timeseries = useMemo(
    () => {
      if (!timeseriesPerSubtype) {
        return [];
      }
      return legends.map(legend => {
        const series = timeseriesPerSubtype[legend.name];

        return {
          name: legend.name,
          values: series,
          color: legend.color
        };
      });
    },
    [timeseriesPerSubtype, legends]
  );

  return receivedDataDuringLifetime ? (
    <EuiPanel>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem grow={false}>
          <TransactionBreakdownHeader
            showChart={showChart}
            hideShowChartButton={!hasHits}
            onToggleClick={() => {
              setShowChart(!showChart);
            }}
          />
        </EuiFlexItem>
        {hasHits && sortedAndColoredKpis ? (
          <EuiFlexItem>
            {sortedAndColoredKpis && (
              <TransactionBreakdownKpiList kpis={sortedAndColoredKpis} />
            )}
          </EuiFlexItem>
        ) : (
          !loading && (
            <>
              <EuiFlexItem>
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
          <EuiFlexItem>
            <TransactionBreakdownGraph timeseries={timeseries} />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiPanel>
  ) : null;
};

export { TransactionBreakdown };
