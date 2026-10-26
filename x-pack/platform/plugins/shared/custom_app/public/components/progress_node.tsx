/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProgress, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { interpolate, type AppNodeOfType } from '@kbn/custom-app-common';
import type { SourceData } from '../data/data_layer';
import { useDataLayer } from '../data/data_layer_context';
import { useSource } from '../data/use_source';
import { useStateValues } from '../runtime/app_runtime_context';
import { DataState } from './data_state';

const ProgressValue = ({ node, data }: { node: AppNodeOfType<'progress'>; data: SourceData }) => {
  const state = useStateValues();
  const [value] = data.rows[0];
  const format = (number: number) => new Intl.NumberFormat(i18n.getLocale()).format(number);

  if (typeof value !== 'number') {
    return (
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.customApp.progress.noNumber', {
            defaultMessage: 'The first column of the first row is not a number.',
          })}
        </p>
      </EuiText>
    );
  }

  return (
    <EuiProgress
      size="m"
      color={node.color}
      value={Math.max(0, Math.min(value, node.max))}
      max={node.max}
      label={node.label === undefined ? undefined : interpolate(node.label, state)}
      valueText={`${format(value)} / ${format(node.max)}`}
      data-test-subj="customAppProgress"
    />
  );
};

/** A bar filled as far as a number of the data is of its largest. */
export const ProgressNode = ({ node }: { node: AppNodeOfType<'progress'> }) => {
  const layer = useDataLayer();
  const state = useSource(node.id);

  return (
    <div data-node-id={node.id}>
      <DataState state={state} onRetry={layer.retry}>
        {(data) => <ProgressValue node={node} data={data} />}
      </DataState>
    </div>
  );
};
