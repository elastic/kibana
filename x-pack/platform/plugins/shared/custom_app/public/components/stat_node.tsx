/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiStat } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { interpolate, type AppNodeOfType } from '@kbn/custom-app-common';
import type { SourceData } from '../data/data_layer';
import { useDataLayer } from '../data/data_layer_context';
import { useSource } from '../data/use_source';
import { useStateValues } from '../runtime/app_runtime_context';
import { DataState } from './data_state';

const formatValue = (value: unknown, format: 'number' | 'compact'): string => {
  if (typeof value !== 'number') return String(value);
  return new Intl.NumberFormat(i18n.getLocale(), {
    notation: format === 'compact' ? 'compact' : 'standard',
  }).format(value);
};

const StatValue = ({ node, data }: { node: AppNodeOfType<'stat'>; data: SourceData }) => {
  const state = useStateValues();
  const columnIndex = node.valueField
    ? data.columns.findIndex(({ name }) => name === node.valueField)
    : 0;
  const value = columnIndex === -1 ? undefined : data.rows[0][columnIndex];

  if (columnIndex === -1) {
    return (
      <KbnDangerCallout
        announceOnMount={false}
        size="s"
        title={i18n.translate('xpack.customApp.statNode.missingColumn', {
          defaultMessage: 'The query has no column named "{column}"',
          values: { column: node.valueField },
        })}
      />
    );
  }

  return (
    <EuiStat
      title={value === null || value === undefined ? '—' : formatValue(value, node.format)}
      description={interpolate(node.title, state)}
      titleSize="l"
      data-test-subj="customAppStat"
    />
  );
};

export const StatNode = ({ node }: { node: AppNodeOfType<'stat'> }) => {
  const layer = useDataLayer();
  const state = useSource(node.source);

  return (
    <div data-node-id={node.id}>
      <DataState state={state} onRetry={layer.retry}>
        {(data) => <StatValue node={node} data={data} />}
      </DataState>
    </div>
  );
};
