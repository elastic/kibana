/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBasicTable, EuiSpacer, EuiText } from '@elastic/eui';
import type { EsqlValue, ResultDocument } from '../../common';
import { formatTime, formatValue } from '../lib/format';

const NUMERIC_TYPES = new Set([
  'byte',
  'short',
  'integer',
  'long',
  'unsigned_long',
  'double',
  'float',
  'half_float',
  'scaled_float',
  'counter_long',
  'counter_double',
  'counter_integer',
]);

interface OutputRow {
  index: number;
  values: EsqlValue[];
}

/** The ES|QL output stored in a task's result document, as a table. */
export const OutputTable = ({ doc }: { doc: ResultDocument }) => {
  const columns: Array<EuiBasicTableColumn<OutputRow>> = doc.columns.map((column, position) => ({
    name: column.name,
    'data-test-subj': `taskRunnerPocOutputColumn-${column.name}`,
    align: NUMERIC_TYPES.has(column.type) ? 'right' : 'left',
    render: (row: OutputRow) => formatValue(row.values[position]),
  }));
  const items = doc.values.map((values, index) => ({ index, values }));
  const shown = items.length;

  return (
    <>
      <EuiBasicTable<OutputRow>
        tableCaption={`Output of task ${doc.taskId}`}
        items={items}
        itemId="index"
        columns={columns}
        compressed
        noItemsMessage="The query returned no rows"
        data-test-subj="taskRunnerPocOutputTable"
      />
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        {shown === doc.rowCount
          ? `${doc.rowCount} ${doc.rowCount === 1 ? 'row' : 'rows'}`
          : `Showing ${shown} of ${doc.rowCount} rows`}
        {doc.truncated ? '; the stored output was truncated' : ''}
        {` · execution ${doc.execution} · written ${formatTime(doc['@timestamp'])}`}
      </EuiText>
    </>
  );
};
