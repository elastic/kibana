/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPanel,
  EuiText,
  EuiTitle
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Location } from 'history';
import React, { Component } from 'react';
import styled from 'styled-components';
import { Coordinate } from '../../../../../typings/timeseries';
import { ITransactionChartData } from '../../../../store/selectors/chartSelectors';
import { IUrlParams } from '../../../../store/urlParams';
import { asInteger, asMillis, tpmUnit } from '../../../../utils/formatters';
import { LicenseContext } from '../../../app/Main/LicenseCheck';
import { MLJobLink } from '../../Links/MachineLearningLinks/MLJobLink';
// @ts-ignore
import CustomPlot from '../CustomPlot';
import { SyncChartGroup } from '../SyncChartGroup';

interface TransactionChartProps {
  charts: ITransactionChartData;
  location: Location;
  urlParams: IUrlParams;
}

const ShiftedIconWrapper = styled.span`
  padding-right: 5px;
  position: relative;
  top: -1px;
  display: inline-block;
`;

const ShiftedEuiText = styled(EuiText)`
  position: relative;
  top: 5px;
`;

const msTimeUnitLabel = i18n.translate(
  'xpack.apm.metrics.transactionChart.msTimeUnitLabel',
  {
    defaultMessage: 'ms'
  }
);

export class TransactionCharts extends Component<TransactionChartProps> {
  public getResponseTimeTickFormatter = (t: number) => {
    return this.props.charts.noHits ? `- ${msTimeUnitLabel}` : asMillis(t);
  };

  public getResponseTimeTooltipFormatter = (p: Coordinate) => {
    return this.props.charts.noHits || !p
      ? `- ${msTimeUnitLabel}`
      : asMillis(p.y);
  };

  public getTPMFormatter = (t: number | null) => {
    const { urlParams, charts } = this.props;
    const unit = tpmUnit(urlParams.transactionType);
    return charts.noHits || t === null
      ? `- ${unit}`
      : `${asInteger(t)} ${unit}`;
  };

  public getTPMTooltipFormatter = (p: Coordinate) => {
    return this.getTPMFormatter(p.y);
  };

  public renderMLHeader(mlAvailable: boolean) {
    const hasMLJob = this.props.charts.hasMLJob;
    if (!mlAvailable || !hasMLJob) {
      return null;
    }

    const { serviceName, transactionType } = this.props.urlParams;

    if (!serviceName) {
      return null;
    }

    return (
      <EuiFlexItem grow={false}>
        <ShiftedEuiText size="xs">
          <ShiftedIconWrapper>
            <EuiIconTip
              content={i18n.translate(
                'xpack.apm.metrics.transactionChart.machineLearningTooltip',
                {
                  defaultMessage:
                    'The stream around the average duration shows the expected bounds. An annotation is shown for anomaly scores >= 75.'
                }
              )}
            />
          </ShiftedIconWrapper>
          <span>
            {i18n.translate(
              'xpack.apm.metrics.transactionChart.machineLearningLabel',
              {
                defaultMessage: 'Machine learning:'
              }
            )}{' '}
          </span>
          <MLJobLink
            serviceName={serviceName}
            transactionType={transactionType}
          >
            View Job
          </MLJobLink>
        </ShiftedEuiText>
      </EuiFlexItem>
    );
  }

  public render() {
    const { charts, urlParams } = this.props;
    const { noHits, responseTimeSeries, tpmSeries } = charts;
    const { transactionType } = urlParams;

    return (
      <SyncChartGroup
        render={hoverXHandlers => (
          <EuiFlexGrid columns={2}>
            <EuiFlexItem>
              <EuiPanel>
                <React.Fragment>
                  <EuiFlexGroup justifyContent="spaceBetween">
                    <EuiFlexItem>
                      <EuiTitle size="xs">
                        <span>{responseTimeLabel(transactionType)}</span>
                      </EuiTitle>
                    </EuiFlexItem>
                    <LicenseContext.Consumer>
                      {license =>
                        this.renderMLHeader(license.features.ml.is_available)
                      }
                    </LicenseContext.Consumer>
                  </EuiFlexGroup>
                  <CustomPlot
                    noHits={noHits}
                    series={responseTimeSeries}
                    {...hoverXHandlers}
                    tickFormatY={this.getResponseTimeTickFormatter}
                    formatTooltipValue={this.getResponseTimeTooltipFormatter}
                  />
                </React.Fragment>
              </EuiPanel>
            </EuiFlexItem>

            <EuiFlexItem style={{ flexShrink: 1 }}>
              <EuiPanel>
                <React.Fragment>
                  <EuiTitle size="xs">
                    <span>{tpmLabel(transactionType)}</span>
                  </EuiTitle>
                  <CustomPlot
                    noHits={noHits}
                    series={tpmSeries}
                    {...hoverXHandlers}
                    tickFormatY={this.getTPMFormatter}
                    formatTooltipValue={this.getTPMTooltipFormatter}
                    truncateLegends
                  />
                </React.Fragment>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGrid>
        )}
      />
    );
  }
}

function tpmLabel(type?: string) {
  return type === 'request'
    ? i18n.translate(
        'xpack.apm.metrics.transactionChart.requestsPerMinuteLabel',
        {
          defaultMessage: 'Requests per minute'
        }
      )
    : i18n.translate(
        'xpack.apm.metrics.transactionChart.transactionsPerMinuteLabel',
        {
          defaultMessage: 'Transactions per minute'
        }
      );
}

function responseTimeLabel(type?: string) {
  switch (type) {
    case 'page-load':
      return i18n.translate(
        'xpack.apm.metrics.transactionChart.pageLoadTimesLabel',
        {
          defaultMessage: 'Page load times'
        }
      );
    case 'route-change':
      return i18n.translate(
        'xpack.apm.metrics.transactionChart.routeChangeTimesLabel',
        {
          defaultMessage: 'Route change times'
        }
      );
    default:
      return i18n.translate(
        'xpack.apm.metrics.transactionChart.transactionDurationLabel',
        {
          defaultMessage: 'Transaction duration'
        }
      );
  }
}
