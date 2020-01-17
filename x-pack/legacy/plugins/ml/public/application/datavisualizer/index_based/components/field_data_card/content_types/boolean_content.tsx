/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiIcon, EuiSpacer, EuiText } from '@elastic/eui';
import { Axis, BarSeries, Chart, Settings } from '@elastic/charts';

import { FormattedMessage } from '@kbn/i18n/react';

import { FieldDataCardProps } from '../field_data_card';
import { roundToDecimalPlace } from '../../../../../formatters/round_to_decimal_place';

function getPercentLabel(value: number): string {
  if (value === 0) {
    return '0%';
  }
  if (value >= 0.1) {
    return `${value}%`;
  } else {
    return '< 0.1%';
  }
}

export const BooleanContent: FC<FieldDataCardProps> = ({ config }) => {
  const { stats } = config;

  const { count, sampleCount, trueCount, falseCount } = stats;
  const docsPercent = roundToDecimalPlace((count / sampleCount) * 100);

  return (
    <div className="mlFieldDataCard__stats">
      <div>
        <EuiText size="xs" color="subdued">
          <EuiIcon type="document" />
          &nbsp;
          <FormattedMessage
            id="xpack.ml.fieldDataCard.cardBoolean.documentsCountDescription"
            defaultMessage="{count, plural, zero {# document} one {# document} other {# documents}} ({docsPercent}%)"
            values={{
              count,
              docsPercent,
            }}
          />
        </EuiText>
      </div>

      <EuiSpacer size="m" />

      <div>
        <EuiText size="s">
          <h6>
            <FormattedMessage
              id="xpack.ml.fieldDataCard.cardBoolean.valuesLabel"
              defaultMessage="Values"
            />
          </h6>
        </EuiText>
        <EuiSpacer size="s" />
        <Chart renderer="canvas" className="story-chart" size={{ height: 200 }}>
          <Axis id="bottom" position="bottom" showOverlappingTicks />
          <Settings
            showLegend={false}
            theme={{
              barSeriesStyle: {
                displayValue: {
                  fill: '#000',
                  fontSize: 12,
                  fontStyle: 'normal',
                  offsetX: 0,
                  offsetY: -5,
                  padding: 0,
                },
              },
            }}
          />
          <BarSeries
            id={config.fieldName || config.fieldFormat}
            data={[
              { x: 'true', y: roundToDecimalPlace((trueCount / count) * 100) },
              { x: 'false', y: roundToDecimalPlace((falseCount / count) * 100) },
            ]}
            displayValueSettings={{
              hideClippedValue: true,
              isAlternatingValueLabel: true,
              valueFormatter: getPercentLabel,
              isValueContainedInElement: false,
              showValueLabel: true,
            }}
            customSeriesColors={['rgba(230, 194, 32, 0.5)', 'rgba(224, 187, 20, 0.71)']}
            splitSeriesAccessors={['x']}
            stackAccessors={['x']}
            xAccessor="x"
            xScaleType="ordinal"
            yAccessors={['y']}
            yScaleType="linear"
          />
        </Chart>
      </div>
    </div>
  );
};
