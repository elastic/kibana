/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

/** A share as a whole percentage, with any share too small to round up still shown as one. */
export const formatShare = (value: number, total: number): string => {
  const percent = total > 0 ? (value / total) * 100 : 0;
  if (percent > 0 && percent < 1) {
    return i18n.translate('xpack.boost.shareMeter.belowOnePercent', {
      defaultMessage: '<1%',
    });
  }
  return i18n.translate('xpack.boost.shareMeter.percent', {
    defaultMessage: '{percent}%',
    values: { percent: Math.round(percent) },
  });
};

interface ShareMeterProps {
  /** The value, shown above the start of the bar. */
  children: ReactNode;
  value: number;
  /** The project's total, which the value is a share of. */
  total: number;
  'data-test-subj'?: string;
}

/**
 * A value above a bar of its share of the project's total, with the share in smaller, subdued text
 * above the bar's end, as a labeled EuiProgress lays them out. Its labels would set the value a size
 * smaller than the values beside the meter, so the row is built here. The bar only repeats the
 * share, so screen readers skip it.
 */
export const ShareMeter = ({
  children,
  value,
  total,
  'data-test-subj': dataTestSubj,
}: ShareMeterProps) => (
  <div data-test-subj={dataTestSubj}>
    <EuiFlexGroup
      gutterSize="xs"
      justifyContent="spaceBetween"
      alignItems="baseline"
      responsive={false}
    >
      <EuiFlexItem grow={false}>{children}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.boost.shareMeter.text', {
            defaultMessage: '{share} of project',
            values: { share: formatShare(value, total) },
          })}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="xs" />
    <EuiProgress
      value={value}
      // An empty project still draws an empty meter.
      max={total > 0 ? total : 1}
      size="s"
      color="primary"
      aria-hidden={true}
    />
  </div>
);

/** Meters stacked with the space between them, which is between EUI's spacer sizes. */
export const ShareMeterGroup = ({ children }: { children: ReactNode }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div css={{ display: 'flex', flexDirection: 'column', gap: euiTheme.size.m }}>{children}</div>
  );
};
