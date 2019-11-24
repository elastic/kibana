/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

import { kibanaFieldFormat } from '../../../../../formatters/kibana_field_format';
import { roundToDecimalPlace } from '../../../../../formatters/round_to_decimal_place';

interface Props {
  stats: any;
  fieldFormat?: any;
  barColor?: 'primary' | 'secondary' | 'danger' | 'subdued' | 'accent';
}

function getPercentLabel(docCount: number, topValuesSampleSize: number): string {
  const percent = (100 * docCount) / topValuesSampleSize;
  if (percent >= 0.1) {
    return `${roundToDecimalPlace(percent, 1)}%`;
  } else {
    return '< 0.1%';
  }
}

export const TopValues: FC<Props> = ({ stats, fieldFormat, barColor }) => {
  const {
    topValues,
    topValuesSampleSize,
    topValuesSamplerShardSize,
    count,
    isTopValuesSampled,
  } = stats;
  const progressBarMax = isTopValuesSampled === true ? topValuesSampleSize : count;

  return (
    <Fragment>
      {topValues.map((value: any) => (
        <EuiFlexGroup gutterSize="xs" alignItems="center" key={value.key}>
          <EuiFlexItem grow={false} style={{ width: 100 }} className="eui-textTruncate">
            <EuiToolTip content={kibanaFieldFormat(value.key, fieldFormat)} position="right">
              <EuiText size="s" textAlign="right">
                {kibanaFieldFormat(value.key, fieldFormat)}
              </EuiText>
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiProgress value={value.doc_count} max={progressBarMax} color={barColor} size="l" />
          </EuiFlexItem>
          <EuiFlexItem grow={false} style={{ width: 70 }} className="eui-textTruncate">
            <EuiText size="s" textAlign="left">
              {getPercentLabel(value.doc_count, progressBarMax)}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ))}
      {isTopValuesSampled === true && (
        <Fragment>
          <EuiSpacer size="xs" />
          <EuiText size="xs">
            <FormattedMessage
              id="xpack.ml.fieldDataCard.topValues.calculatedFromSampleDescription"
              defaultMessage="Calculated from sample of {topValuesSamplerShardSize} documents per shard"
              values={{
                topValuesSamplerShardSize,
              }}
            />
          </EuiText>
        </Fragment>
      )}
    </Fragment>
  );
};
