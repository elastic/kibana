/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import type { AppNodeOfType } from '@kbn/custom-app-common';
import type { SourceData } from '../data/data_layer';
import { useDataLayer } from '../data/data_layer_context';
import { useSource } from '../data/use_source';
import { DataState } from './data_state';
import { formatValue } from './format_value';
import { MissingColumn } from './missing_column';

const KeyValueList = ({ node, data }: { node: AppNodeOfType<'key_value'>; data: SourceData }) => {
  const names = node.fields ?? data.columns.map(({ name }) => name);
  const missing = names.filter((name) => !data.columns.some((column) => column.name === name));
  if (missing.length > 0) return <MissingColumn columns={missing} />;

  const [row] = data.rows;
  return (
    <EuiDescriptionList
      type="column"
      compressed
      listItems={names.map((name) => ({
        title: name,
        description:
          formatValue(row[data.columns.findIndex((column) => column.name === name)]) || '—',
      }))}
    />
  );
};

export const KeyValueNode = ({ node }: { node: AppNodeOfType<'key_value'> }) => {
  const layer = useDataLayer();
  const state = useSource(node.source);

  return (
    <div data-node-id={node.id}>
      <DataState state={state} onRetry={layer.retry}>
        {(data) => <KeyValueList node={node} data={data} />}
      </DataState>
    </div>
  );
};
