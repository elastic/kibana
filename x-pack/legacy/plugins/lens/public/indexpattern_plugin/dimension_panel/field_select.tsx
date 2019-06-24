/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBox } from '@elastic/eui';
import { IndexPatternColumn, FieldBasedIndexPatternColumn } from '../indexpattern';
import { IndexPatternDimensionPanelProps } from './dimension_panel';
import { changeColumn, deleteColumn, hasField, sortByField } from '../state_helpers';

export interface FieldSelectProps extends IndexPatternDimensionPanelProps {
  selectedColumn: IndexPatternColumn;
  filteredColumns: IndexPatternColumn[];
}

export function FieldSelect({
  selectedColumn,
  filteredColumns,
  state,
  columnId,
  setState,
}: FieldSelectProps) {
  const fieldColumns = filteredColumns.filter(hasField) as FieldBasedIndexPatternColumn[];

  const uniqueColumnsByField = sortByField(
    _.uniq(
      fieldColumns
        .filter(col => selectedColumn && col.operationType === selectedColumn.operationType)
        .concat(fieldColumns),
      col => col.sourceField
    )
  );

  const fieldOptions = [];
  const fieldLessColumn = filteredColumns.find(column => !hasField(column));
  if (fieldLessColumn) {
    fieldOptions.push({
      label: i18n.translate('xpack.lens.indexPattern.documentField', {
        defaultMessage: 'Document',
      }),
      value: fieldLessColumn.operationId,
    });
  }

  // TODO sort the operations from compatible to not compatible
  if (uniqueColumnsByField.length > 0) {
    fieldOptions.push({
      label: i18n.translate('xpack.lens.indexPattern.individualFieldsLabel', {
        defaultMessage: 'Individual fields',
      }),
      options: uniqueColumnsByField.map(col => ({
        label: col.sourceField,
        value: col.operationId,
        // TODO pass down and use information about invalid selected operations here
        compatible: !selectedColumn || col.operationType === selectedColumn.operationType,
      })),
    });
  }

  return (
    <>
      <EuiComboBox
        fullWidth
        inputRef={el => {
          if (el) {
            el.focus();
          }
        }}
        data-test-subj="indexPattern-dimension-field"
        placeholder={i18n.translate('xpack.lens.indexPattern.fieldPlaceholder', {
          defaultMessage: 'Field',
        })}
        options={fieldOptions}
        selectedOptions={
          selectedColumn && hasField(selectedColumn)
            ? [
                {
                  label: selectedColumn.sourceField,
                  value: selectedColumn.operationId,
                },
              ]
            : []
        }
        singleSelection={{ asPlainText: true }}
        isClearable={true}
        onChange={choices => {
          if (choices.length === 0) {
            setState(deleteColumn(state, columnId));
            return;
          }

          const column: IndexPatternColumn = filteredColumns.find(
            ({ operationId }) => operationId === choices[0].value
          )!;

          setState(changeColumn(state, columnId, column));
        }}
        renderOption={(option, searchValue, contentClassName) => {
          const { compatible, label } = option as { compatible: boolean; label: string };
          return (
            <span className={contentClassName}>
              {label}
              &nbsp;
              {!compatible && 'Not compatible!!!'}
            </span>
          );
        }}
      />
    </>
  );
}
