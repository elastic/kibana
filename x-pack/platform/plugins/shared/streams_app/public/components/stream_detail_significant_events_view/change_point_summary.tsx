/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import React from 'react';
import type { TickFormatter } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import type { FormattedChangePoint } from './utils/change_point';

const MAX_VISIBLE_CHANGES = 5;

export function ChangePointSummary({
  changes,
  xFormatter,
}: {
  changes: FormattedChangePoint[];
  xFormatter: TickFormatter;
}) {
  const visibleChanges = changes.slice(0, MAX_VISIBLE_CHANGES);

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      {visibleChanges.map((change, index) => (
        <>
          <SummaryItem key={change.time} change={change} xFormatter={xFormatter} />
          {index < changes.length - 1 && <EuiHorizontalRule margin="xs" />}
        </>
      ))}
      {changes.length > MAX_VISIBLE_CHANGES && (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.streams.changePointSummary.moreChanges', {
              defaultMessage: '+ {count} more',
              values: { count: changes.length - MAX_VISIBLE_CHANGES },
            })}
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}

function SummaryItem({
  change,
  xFormatter,
}: {
  change: FormattedChangePoint;
  xFormatter: TickFormatter;
}) {
  const theme = useEuiTheme().euiTheme;
  return (
    <>
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

      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          <b>
            {i18n.translate('xpack.streams.changePointSummary.significantEvent', {
              defaultMessage: 'Significant event:',
            })}
          </b>{' '}
          {change.query.title}
        </EuiText>
      </EuiFlexItem>
    </>
  );
}
