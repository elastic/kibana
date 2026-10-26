/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiPanel, EuiStat, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { interpolate, type AppNodeOfType } from '@kbn/custom-app-common';
import type { SourceData } from '../data/data_layer';
import { useDataLayer } from '../data/data_layer_context';
import { useSource } from '../data/use_source';
import { useStateValues } from '../runtime/app_runtime_context';
import { DataState } from './data_state';

const formatNumber = (value: number): string =>
  new Intl.NumberFormat(i18n.getLocale()).format(value);

const formatChange = (change: number): string =>
  new Intl.NumberFormat(i18n.getLocale(), {
    style: 'percent',
    maximumFractionDigits: 1,
    signDisplay: 'exceptZero',
  }).format(change);

/** How much a value changed from the one before it, as a fraction; none when that cannot be said. */
export const getChange = (value: unknown, previous: unknown): number | undefined =>
  typeof value === 'number' && typeof previous === 'number' && previous !== 0
    ? (value - previous) / Math.abs(previous)
    : undefined;

const MetricValue = ({ node, data }: { node: AppNodeOfType<'metric'>; data: SourceData }) => {
  const state = useStateValues();
  const [row] = data.rows;
  const [value] = row;
  const compareIndex =
    node.compare === undefined ? -1 : data.columns.findIndex(({ name }) => name === node.compare);
  const change = compareIndex === -1 ? undefined : getChange(value, row[compareIndex]);
  const isBetter =
    change === undefined ? undefined : node.betterWhen === 'higher' ? change > 0 : change < 0;
  const color = change === 0 || change === undefined ? 'subdued' : isBetter ? 'success' : 'danger';

  return (
    <EuiStat
      title={
        value === null || value === undefined
          ? '—'
          : typeof value === 'number'
          ? formatNumber(value)
          : String(value)
      }
      description={interpolate(node.title, state)}
      titleSize="l"
      reverse
      data-test-subj="customAppMetric"
    >
      {change === undefined ? null : (
        <EuiText size="xs" color={color} data-test-subj="customAppMetricChange">
          {change === 0 ? null : (
            <EuiIcon type={change > 0 ? 'sortUp' : 'sortDown'} size="s" aria-hidden="true" />
          )}{' '}
          {formatChange(change)}
        </EuiText>
      )}
    </EuiStat>
  );
};

/** A number with how it changed from what it was before, when the query says what that was. */
export const MetricNode = ({ node }: { node: AppNodeOfType<'metric'> }) => {
  const layer = useDataLayer();
  const state = useSource(node.id);

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m" data-node-id={node.id}>
      <DataState state={state} onRetry={layer.retry}>
        {(data) => <MetricValue node={node} data={data} />}
      </DataState>
    </EuiPanel>
  );
};
