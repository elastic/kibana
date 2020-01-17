/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useEffect, useState } from 'react';
import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { FieldDataCardProps } from '../field_data_card';
import { DisplayValue } from '../../../../../components/display_value';
import { kibanaFieldFormat } from '../../../../../formatters/kibana_field_format';
import { numberAsOrdinal } from '../../../../../formatters/number_as_ordinal';
import { roundToDecimalPlace } from '../../../../../formatters/round_to_decimal_place';
import {
  MetricDistributionChart,
  MetricDistributionChartData,
  buildChartDataFromStats,
} from '../metric_distribution_chart';
import { TopValues } from '../top_values';

enum DETAILS_MODE {
  DISTRIBUTION = 'distribution',
  TOP_VALUES = 'top_values',
}

const METRIC_DISTRIBUTION_CHART_WIDTH = 325;
const METRIC_DISTRIBUTION_CHART_HEIGHT = 210;
const DEFAULT_TOP_VALUES_THRESHOLD = 100;

export const NumberContent: FC<FieldDataCardProps> = ({ config }) => {
  const { stats, fieldFormat } = config;

  useEffect(() => {
    const chartData = buildChartDataFromStats(stats, METRIC_DISTRIBUTION_CHART_WIDTH);
    setDistributionChartData(chartData);
  }, []);

  const { count, sampleCount, cardinality, min, median, max, distribution } = stats;
  const docsPercent = roundToDecimalPlace((count / sampleCount) * 100);

  const [detailsMode, setDetailsMode] = useState(
    cardinality <= DEFAULT_TOP_VALUES_THRESHOLD
      ? DETAILS_MODE.TOP_VALUES
      : DETAILS_MODE.DISTRIBUTION
  );

  const defaultChartData: MetricDistributionChartData[] = [];
  const [distributionChartData, setDistributionChartData] = useState(defaultChartData);

  const detailsOptions = [
    {
      id: DETAILS_MODE.TOP_VALUES,
      label: i18n.translate('xpack.ml.fieldDataCard.cardNumber.details.topValuesLabel', {
        defaultMessage: 'Top values',
      }),
    },
    {
      id: DETAILS_MODE.DISTRIBUTION,
      label: i18n.translate('xpack.ml.fieldDataCard.cardNumber.details.distributionOfValuesLabel', {
        defaultMessage: 'Distribution',
      }),
    },
  ];

  return (
    <div className="mlFieldDataCard__stats">
      <div>
        <EuiText size="xs" color="subdued">
          <EuiIcon type="document" />
          &nbsp;
          <FormattedMessage
            id="xpack.ml.fieldDataCard.cardNumber.documentsCountDescription"
            defaultMessage="{count, plural, zero {# document} one {# document} other {# documents}} ({docsPercent}%)"
            values={{
              count,
              docsPercent,
            }}
          />
        </EuiText>
      </div>
      <EuiSpacer size="xs" />
      <div>
        <EuiText size="xs" color="subdued">
          <EuiIcon type="database" />
          &nbsp;
          <FormattedMessage
            id="xpack.ml.fieldDataCard.cardNumber.distinctCountDescription"
            defaultMessage="{cardinality} distinct {cardinality, plural, zero {value} one {value} other {values}}"
            values={{
              cardinality,
            }}
          />
        </EuiText>
      </div>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="xs" justifyContent="center">
        <EuiFlexItem grow={1}>
          <EuiText color="subdued" size="xs">
            <FormattedMessage
              id="xpack.ml.fieldDataCard.cardNumber.minLabel"
              defaultMessage="min"
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiText color="subdued" size="xs">
            <FormattedMessage
              id="xpack.ml.fieldDataCard.cardNumber.medianLabel"
              defaultMessage="median"
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiText color="subdued" size="xs">
            <FormattedMessage
              id="xpack.ml.fieldDataCard.cardNumber.maxLabel"
              defaultMessage="max"
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup gutterSize="xs" justifyContent="center">
        <EuiFlexItem grow={1} className="eui-textTruncate">
          <DisplayValue value={kibanaFieldFormat(min, fieldFormat)} />
        </EuiFlexItem>
        <EuiFlexItem grow={1} className="eui-textTruncate">
          <DisplayValue value={kibanaFieldFormat(median, fieldFormat)} />
        </EuiFlexItem>
        <EuiFlexItem grow={1} className="eui-textTruncate">
          <DisplayValue value={kibanaFieldFormat(max, fieldFormat)} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiButtonGroup
        options={detailsOptions}
        idSelected={detailsMode}
        onChange={optionId => setDetailsMode(optionId as DETAILS_MODE)}
        aria-label={i18n.translate(
          'xpack.ml.fieldDataCard.cardNumber.selectMetricDetailsDisplayAriaLabel',
          {
            defaultMessage: 'Select display option for metric details',
          }
        )}
        data-test-subj="mlFieldDataCardNumberDetailsSelect"
        isFullWidth={true}
        buttonSize="compressed"
      />
      <EuiSpacer size="m" />
      {detailsMode === DETAILS_MODE.DISTRIBUTION && (
        <Fragment>
          <EuiFlexGroup justifyContent="spaceAround" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiText size="xs">
                <FormattedMessage
                  id="xpack.ml.fieldDataCard.cardNumber.displayingPercentilesLabel"
                  defaultMessage="Displaying {minPercent} - {maxPercent} percentiles"
                  values={{
                    minPercent: numberAsOrdinal(distribution.minPercentile),
                    maxPercent: numberAsOrdinal(distribution.maxPercentile),
                  }}
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexGroup justifyContent="center" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <MetricDistributionChart
                width={METRIC_DISTRIBUTION_CHART_WIDTH}
                height={METRIC_DISTRIBUTION_CHART_HEIGHT}
                chartData={distributionChartData}
                fieldFormat={fieldFormat}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </Fragment>
      )}
      {detailsMode === DETAILS_MODE.TOP_VALUES && (
        <EuiFlexGroup>
          <EuiFlexItem>
            <TopValues stats={stats} fieldFormat={fieldFormat} barColor="primary" />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </div>
  );
};
