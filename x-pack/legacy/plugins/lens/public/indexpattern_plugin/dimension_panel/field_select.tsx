/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { useRef, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import classNames from 'classnames';
import { IndexPatternColumn, FieldBasedIndexPatternColumn, OperationType } from '../indexpattern';
import { hasField, sortByField } from '../state_helpers';

export interface FieldSelectProps {
  invalidOperationType: OperationType | null;
  selectedColumn?: IndexPatternColumn;
  filteredColumns: IndexPatternColumn[];
  onChangeColumn: (newColumn: IndexPatternColumn) => void;
  onDeleteColumn: () => void;
}

export function FieldSelect({
  invalidOperationType,
  selectedColumn,
  filteredColumns,
  onChangeColumn,
  onDeleteColumn,
}: FieldSelectProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fieldColumns = filteredColumns.filter(hasField) as FieldBasedIndexPatternColumn[];

  const uniqueColumnsByField = sortByField(
    _.uniq(
      fieldColumns
        .filter(col =>
          invalidOperationType
            ? col.operationType === invalidOperationType
            : selectedColumn && col.operationType === selectedColumn.operationType
        )
        .concat(fieldColumns),
      col => col.sourceField
    )
  );

  useEffect(
    () => {
      if (!selectedColumn && invalidOperationType && inputRef.current) {
        inputRef.current.focus();
      }
    },
    [selectedColumn, invalidOperationType]
  );

  const fieldOptions = [];
  const fieldLessColumn = filteredColumns.find(column => !hasField(column));
  if (fieldLessColumn) {
    fieldOptions.push({
      label: i18n.translate('xpack.lens.indexPattern.documentField', {
        defaultMessage: 'Document',
      }),
      value: fieldLessColumn.operationId,
      className: classNames({
        'lnsConfigPanel__fieldOption--incompatible': invalidOperationType
          ? fieldLessColumn.operationType !== invalidOperationType
          : selectedColumn && fieldLessColumn.operationType !== selectedColumn.operationType,
      }),
    });
  }

  if (uniqueColumnsByField.length > 0) {
    fieldOptions.push({
      label: i18n.translate('xpack.lens.indexPattern.individualFieldsLabel', {
        defaultMessage: 'Individual fields',
      }),
      options: uniqueColumnsByField
        .map(col => ({
          label: col.sourceField,
          value: col.operationId,
          compatible: invalidOperationType
            ? col.operationType === invalidOperationType
            : !selectedColumn || col.operationType === selectedColumn.operationType,
        }))
        .sort(({ compatible: a }, { compatible: b }) => {
          if (a && !b) {
            return -1;
          }
          if (!a && b) {
            return 1;
          }
          return 0;
        })
        .map(({ label, value, compatible }) => ({
          label,
          value,
          className: classNames({ 'lnsConfigPanel__fieldOption--incompatible': !compatible }),
        })),
    });
  }

  return (
    <EuiComboBox
      fullWidth
      inputRef={el => {
        if (el) {
          inputRef.current = el;
        }
      }}
      data-test-subj="indexPattern-dimension-field"
      placeholder={i18n.translate('xpack.lens.indexPattern.fieldPlaceholder', {
        defaultMessage: 'Field',
      })}
      options={fieldOptions}
      isInvalid={Boolean(invalidOperationType && selectedColumn)}
      selectedOptions={
        selectedColumn
          ? hasField(selectedColumn)
            ? [
                {
                  label: selectedColumn.sourceField,
                  value: selectedColumn.operationId,
                },
              ]
            : [fieldOptions[0]]
          : []
      }
      singleSelection={{ asPlainText: true }}
      onChange={choices => {
        if (choices.length === 0) {
          onDeleteColumn();
          return;
        }

        const column: IndexPatternColumn = filteredColumns.find(
          ({ operationId }) => operationId === choices[0].value
        )!;

        onChangeColumn(column);
      }}
    />
  );
}
