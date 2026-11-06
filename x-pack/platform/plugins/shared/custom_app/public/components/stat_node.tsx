/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiStat } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { interpolate, type AppNodeOfType } from '@kbn/custom-app-common';
import type { SourceData } from '../data/data_layer';
import { useDataLayer } from '../data/data_layer_context';
import { useSource } from '../data/use_source';
import { useStateValues } from '../runtime/app_runtime_context';
import { DataState } from './data_state';

const formatValue = (value: unknown): string =>
  typeof value === 'number' ? new Intl.NumberFormat(i18n.getLocale()).format(value) : String(value);

/** A stat shows the first column of the first row. A query that wants another can KEEP it. */
const StatValue = ({ node, data }: { node: AppNodeOfType<'stat'>; data: SourceData }) => {
  const state = useStateValues();
  const [value] = data.rows[0];

  return (
    <EuiStat
      title={value === null || value === undefined ? '—' : formatValue(value)}
      description={interpolate(node.title, state)}
      titleSize="l"
      reverse
      data-test-subj="customAppStat"
    />
  );
};

export const StatNode = ({ node }: { node: AppNodeOfType<'stat'> }) => {
  const layer = useDataLayer();
  const state = useSource(node.id);

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m" data-node-id={node.id}>
      <DataState state={state} onRetry={layer.retry}>
        {(data) => <StatValue node={node} data={data} />}
      </DataState>
    </EuiPanel>
  );
};
