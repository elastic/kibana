/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList, EuiHorizontalRule, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AppNodeOfType } from '@kbn/custom-app-common';
import type { SourceData } from '../data/data_layer';
import { useDataLayer } from '../data/data_layer_context';
import { useSource } from '../data/use_source';
import { DataState } from './data_state';
import { formatValue } from './format_value';
import { MissingColumn } from './missing_column';

/** More than this is a table's job; a list that long is not a list anyone reads. */
export const MAX_LIST_ROWS = 25;

const KeyValueList = ({ node, data }: { node: AppNodeOfType<'key_value'>; data: SourceData }) => {
  const names = node.fields ?? data.columns.map(({ name }) => name);
  const missing = names.filter((name) => !data.columns.some((column) => column.name === name));
  if (missing.length > 0) return <MissingColumn columns={missing} />;

  const indexes = names.map((name) => data.columns.findIndex((column) => column.name === name));
  const shown = data.rows.slice(0, MAX_LIST_ROWS);

  return (
    <>
      {shown.map((row, position) => (
        <React.Fragment key={position}>
          {position > 0 && <EuiHorizontalRule margin="s" />}
          <EuiDescriptionList
            type="column"
            compressed
            listItems={names.map((name, at) => ({
              title: name,
              description: formatValue(row[indexes[at]]) || '—',
            }))}
          />
        </React.Fragment>
      ))}
      {data.rows.length > shown.length && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued" data-test-subj="customAppKeyValueMoreRows">
            <p>
              {i18n.translate('xpack.customApp.keyValueNode.firstOfMany', {
                defaultMessage: 'Showing the first {shown} of {count} rows.',
                values: { shown: shown.length, count: data.rows.length },
              })}
            </p>
          </EuiText>
        </>
      )}
    </>
  );
};

export const KeyValueNode = ({ node }: { node: AppNodeOfType<'key_value'> }) => {
  const layer = useDataLayer();
  const state = useSource(node.id);

  return (
    <div data-node-id={node.id}>
      <DataState state={state} onRetry={layer.retry}>
        {(data) => <KeyValueList node={node} data={data} />}
      </DataState>
    </div>
  );
};
