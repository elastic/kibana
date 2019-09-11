/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiHorizontalRule, EuiSwitch, EuiSelect, EuiFormLabel } from '@elastic/eui';
import { IndexPatternLayer } from '../indexpattern';

function nestColumn(columnOrder: string[], outer: string, inner: string) {
  const result = columnOrder.filter(c => c !== inner);
  const outerPosition = result.indexOf(outer);

  result.splice(outerPosition + 1, 0, inner);

  return result;
}

export function BucketNestingEditor({
  columnId,
  layer,
  setColumns,
}: {
  columnId: string;
  layer: IndexPatternLayer;
  setColumns: (columns: string[]) => void;
}) {
  const column = layer.columns[columnId];
  const columns = Object.entries(layer.columns);
  const aggColumns = columns
    .filter(([id, c]) => id !== columnId && c.isBucketed)
    .map(([value, c]) => ({ value, text: c.label }));

  if (!column || !column.isBucketed || !aggColumns.length) {
    return null;
  }

  const prevColumn = layer.columnOrder[layer.columnOrder.indexOf(columnId) - 1];

  if (aggColumns.length === 1) {
    const [target] = aggColumns;

    return (
      <EuiFormRow>
        <>
          <EuiHorizontalRule margin="m" />
          <EuiSwitch
            data-test-subj="indexPattern-nesting-switch"
            label={i18n.translate('xpack.lens.xyChart.nestUnderTarget', {
              defaultMessage: 'Nest under {target}',
              values: { target: target.text },
            })}
            checked={!!prevColumn}
            onChange={() => {
              if (prevColumn) {
                setColumns(nestColumn(layer.columnOrder, columnId, target.value));
              } else {
                setColumns(nestColumn(layer.columnOrder, target.value, columnId));
              }
            }}
          />
        </>
      </EuiFormRow>
    );
  }

  return (
    <EuiFormRow>
      <>
        <EuiHorizontalRule margin="m" />
        <EuiFormLabel>
          {i18n.translate('xpack.lens.xyChart.nestUnder', {
            defaultMessage: 'Nest under',
          })}
        </EuiFormLabel>
        <EuiSelect
          data-test-subj="indexPattern-nesting-select"
          options={[
            {
              value: '',
              text: i18n.translate('xpack.lens.xyChart.nestUnderRoot', {
                defaultMessage: 'Top level',
              }),
            },
            ...aggColumns,
          ]}
          value={prevColumn}
          onChange={e => setColumns(nestColumn(layer.columnOrder, e.target.value, columnId))}
        />
      </>
    </EuiFormRow>
  );
}
