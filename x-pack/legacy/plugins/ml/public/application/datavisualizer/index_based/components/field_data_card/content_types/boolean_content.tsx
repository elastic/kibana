/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiProgress, EuiSpacer, EuiText } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

import { FieldDataCardProps } from '../field_data_card';
import { roundToDecimalPlace } from '../../../../../formatters/round_to_decimal_place';

function getPercentLabel(valueCount: number, totalCount: number): string {
  if (valueCount === 0) {
    return '0%';
  }

  const percent = (100 * valueCount) / totalCount;
  if (percent >= 0.1) {
    return `${roundToDecimalPlace(percent, 1)}%`;
  } else {
    return '< 0.1%';
  }
}

export const BooleanContent: FC<FieldDataCardProps> = ({ config }) => {
  const { stats } = config;

  const { count, sampleCount, trueCount, falseCount } = stats;
  const docsPercent = roundToDecimalPlace((count / sampleCount) * 100);

  // TODO - display counts of true / false in an Elastic Charts bar chart (or Pie chart if available).

  return (
    <div className="mlFieldDataCard__stats">
      <div>
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
      </div>

      <EuiSpacer size="m" />

      <div>
        <FormattedMessage
          id="xpack.ml.fieldDataCard.cardBoolean.valuesLabel"
          defaultMessage="values"
        />
        <EuiSpacer size="xs" />
        <EuiFlexGroup gutterSize="xs" alignItems="center">
          <EuiFlexItem grow={false} style={{ width: 100 }} className="eui-textTruncate">
            <EuiText size="s" textAlign="right">
              true
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiProgress value={trueCount} max={count} color="primary" size="l" />
          </EuiFlexItem>
          <EuiFlexItem grow={false} style={{ width: 70 }} className="eui-textTruncate">
            <EuiText size="s" textAlign="left">
              {getPercentLabel(trueCount, count)}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="xs" />

        <EuiFlexGroup gutterSize="xs" alignItems="center">
          <EuiFlexItem grow={false} style={{ width: 100 }} className="eui-textTruncate">
            <EuiText size="s" textAlign="right">
              false
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiProgress value={falseCount} max={count} color="subdued" size="l" />
          </EuiFlexItem>
          <EuiFlexItem grow={false} style={{ width: 70 }} className="eui-textTruncate">
            <EuiText size="s" textAlign="left">
              {getPercentLabel(falseCount, count)}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </div>
  );
};
