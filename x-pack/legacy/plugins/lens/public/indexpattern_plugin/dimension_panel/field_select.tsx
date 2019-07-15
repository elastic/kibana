/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBox, EuiFlexGroup, EuiFlexItem, EuiComboBoxOptionProps } from '@elastic/eui';
import classNames from 'classnames';
import {
  // @ts-ignore
  EuiHighlight,
} from '@elastic/eui';
import {
  IndexPatternColumn,
  FieldBasedIndexPatternColumn,
  OperationType,
  BaseIndexPatternColumn,
} from '../indexpattern';
import { FieldIcon } from '../field_icon';
import { DataType } from '../../types';
import { hasField, sortByField } from '../utils';

export interface FieldSelectProps {
  incompatibleSelectedOperationType: OperationType | null;
  selectedColumn?: IndexPatternColumn;
  filteredColumns: IndexPatternColumn[];
  onChangeColumn: (newColumn: IndexPatternColumn) => void;
  onDeleteColumn: () => void;
}

export function FieldSelect({
  incompatibleSelectedOperationType,
  selectedColumn,
  filteredColumns,
  onChangeColumn,
  onDeleteColumn,
}: FieldSelectProps) {
  const fieldColumns = filteredColumns.filter(hasField) as FieldBasedIndexPatternColumn[];

  const uniqueColumnsByField = sortByField(
    _.uniq(
      fieldColumns
        .filter(col =>
          incompatibleSelectedOperationType
            ? col.operationType === incompatibleSelectedOperationType
            : selectedColumn && col.operationType === selectedColumn.operationType
        )
        .concat(fieldColumns),
      col => col.sourceField
    )
  );

  function isCompatibleWithCurrentOperation(col: BaseIndexPatternColumn) {
    if (incompatibleSelectedOperationType) {
      return col.operationType === incompatibleSelectedOperationType;
    }
    return !selectedColumn || col.operationType === selectedColumn.operationType;
  }

  const fieldOptions = [];
  const fieldlessColumn =
    filteredColumns.find(column => !hasField(column) && isCompatibleWithCurrentOperation(column)) ||
    filteredColumns.find(column => !hasField(column));

  if (fieldlessColumn) {
    fieldOptions.push({
      label: i18n.translate('xpack.lens.indexPattern.documentField', {
        defaultMessage: 'Document',
      }),
      value: fieldlessColumn.operationId,
      className: classNames({
        'lnsConfigPanel__fieldOption--incompatible': !isCompatibleWithCurrentOperation(
          fieldlessColumn
        ),
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
          value: { operationId: col.operationId, dataType: col.dataType },
          compatible: isCompatibleWithCurrentOperation(col),
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
      data-test-subj="indexPattern-dimension-field"
      placeholder={i18n.translate('xpack.lens.indexPattern.fieldPlaceholder', {
        defaultMessage: 'Field',
      })}
      options={(fieldOptions as unknown) as EuiComboBoxOptionProps[]}
      isInvalid={Boolean(incompatibleSelectedOperationType && selectedColumn)}
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
          ({ operationId }) =>
            operationId === ((choices[0].value as unknown) as { operationId: string }).operationId
        )!;

        onChangeColumn(column);
      }}
      renderOption={(option, searchValue) => {
        return (
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={null}>
              <FieldIcon type={((option.value as unknown) as { dataType: DataType }).dataType} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      }}
    />
  );
}
