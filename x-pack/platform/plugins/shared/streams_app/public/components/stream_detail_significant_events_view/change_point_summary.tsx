/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { TickFormatter } from '@elastic/charts';
import { FormattedChangePoint } from './change_point';

export function ChangePointSummary({
  change,
  xFormatter,
}: {
  change?: FormattedChangePoint;
  xFormatter: TickFormatter;
}) {
  const theme = useEuiTheme().euiTheme;

  if (!change) {
    return (
      <EuiText
        size="xs"
        color="subdued"
        className={css`
          white-space: nowrap;
        `}
      >
        {i18n.translate('xpack.streams.significantEventsTable.changePointBadge.noChangesDetected', {
          defaultMessage: 'No changes detected',
        })}
      </EuiText>
    );
  }

  return (
    <EuiFlexGroup
      direction="row"
      gutterSize="s"
      className={css`
        white-space: nowrap;
      `}
      alignItems="center"
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="row" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="row" gutterSize="none" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiIcon type="dot" color={theme.colors[change.color]} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs">{change.label}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{change.type}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          @ {xFormatter(change.time)}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
