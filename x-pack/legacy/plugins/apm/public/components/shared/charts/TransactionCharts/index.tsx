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
  EuiTitle,
  EuiSpacer
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Location } from 'history';
import React, { Component } from 'react';
import { isEmpty, flatten } from 'lodash';
import styled from 'styled-components';
import { idx } from '@kbn/elastic-idx';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { Coordinate, TimeSeries } from '../../../../../typings/timeseries';
import { ITransactionChartData } from '../../../../selectors/chartSelectors';
import { IUrlParams } from '../../../../context/UrlParamsContext/types';
import {
  asInteger,
  tpmUnit,
  TimeFormatter
} from '../../../../utils/formatters';
import { MLJobLink } from '../../Links/MachineLearningLinks/MLJobLink';
import { LicenseContext } from '../../../../context/LicenseContext';
import { TransactionLineChart } from './TransactionLineChart';
import { isValidCoordinateValue } from '../../../../utils/isValidCoordinateValue';
import { getTimeFormatter } from '../../../../utils/formatters';
import { PageLoadCharts } from './PageLoadCharts';

interface TransactionChartProps {
  hasMLJob: boolean;
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

const RUM_PAGE_LOAD_TYPE = 'page-load';

export class TransactionCharts extends Component<TransactionChartProps> {
  public getMaxY = (responseTimeSeries: TimeSeries[]) => {
    const coordinates = flatten(
      responseTimeSeries.map((serie: TimeSeries) => serie.data as Coordinate[])
    );

    const numbers: number[] = coordinates.map((c: Coordinate) =>
      c.y ? c.y : 0
    );

    return Math.max(...numbers, 0);
  };

  public getResponseTimeTickFormatter = (formatter: TimeFormatter) => {
    return (t: number) => formatter(t);
  };

  public getResponseTimeTooltipFormatter = (formatter: TimeFormatter) => {
    return (p: Coordinate) => {
      return isValidCoordinateValue(p.y) ? formatter(p.y) : NOT_AVAILABLE_LABEL;
    };
  };

  public getTPMFormatter = (t: number) => {
    const { urlParams } = this.props;
    const unit = tpmUnit(urlParams.transactionType);
    return `${asInteger(t)} ${unit}`;
  };

  public getTPMTooltipFormatter = (p: Coordinate) => {
    return isValidCoordinateValue(p.y)
      ? this.getTPMFormatter(p.y)
      : NOT_AVAILABLE_LABEL;
  };

  public renderMLHeader(hasValidMlLicense: boolean | undefined) {
    const { hasMLJob } = this.props;
    if (!hasValidMlLicense || !hasMLJob) {
      return null;
    }

    const { serviceName, transactionType, kuery } = this.props.urlParams;
    if (!serviceName) {
      return null;
    }

    const hasKuery = !isEmpty(kuery);
    const icon = hasKuery ? (
      <EuiIconTip
        aria-label="Warning"
        type="alert"
        color="warning"
        content="The Machine learning results are hidden when the search bar is used for filtering"
      />
    ) : (
      <EuiIconTip
        content={i18n.translate(
          'xpack.apm.metrics.transactionChart.machineLearningTooltip',
          {
            defaultMessage:
              'The stream around the average duration shows the expected bounds. An annotation is shown for anomaly scores >= 75.'
          }
        )}
      />
    );

    return (
      <EuiFlexItem grow={false}>
        <ShiftedEuiText size="xs">
          <ShiftedIconWrapper>{icon}</ShiftedIconWrapper>
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
    const { responseTimeSeries, tpmSeries } = charts;
    const { transactionType } = urlParams;
    const maxY = this.getMaxY(responseTimeSeries);
    const formatter = getTimeFormatter(maxY);

    return (
      <>
        <EuiFlexGrid columns={2} gutterSize="s">
          <EuiFlexItem data-cy={`transaction-duration-charts`}>
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
                      this.renderMLHeader(
                        idx(license, _ => _.features.ml.is_available)
                      )
                    }
                  </LicenseContext.Consumer>
                </EuiFlexGroup>
                <TransactionLineChart
                  series={responseTimeSeries}
                  tickFormatY={this.getResponseTimeTickFormatter(formatter)}
                  formatTooltipValue={this.getResponseTimeTooltipFormatter(
                    formatter
                  )}
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
                <TransactionLineChart
                  series={tpmSeries}
                  tickFormatY={this.getTPMFormatter}
                  formatTooltipValue={this.getTPMTooltipFormatter}
                  truncateLegends
                />
              </React.Fragment>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGrid>
        {transactionType === RUM_PAGE_LOAD_TYPE ? (
          <>
            <EuiSpacer size="s" />
            <PageLoadCharts />
          </>
        ) : null}
      </>
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
    case RUM_PAGE_LOAD_TYPE:
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
