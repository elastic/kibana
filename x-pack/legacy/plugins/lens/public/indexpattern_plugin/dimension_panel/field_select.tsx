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
  OperationType,
  IndexPattern,
  IndexPatternField,
} from '../indexpattern';
import { FieldIcon } from '../field_icon';
import { DataType } from '../../types';
import { hasField } from '../utils';
import { OperationMapping, operationDefinitionMap } from '../operations';

export type FieldChoice = { type: 'field'; field: string } | { type: 'document' };

export interface FieldSelectProps {
  currentIndexPattern: IndexPattern;
  fieldMap: Record<string, IndexPatternField>;
  incompatibleSelectedOperationType: OperationType | null;
  selectedColumn?: IndexPatternColumn;
  filteredOperations: OperationMapping[];
  onChoose: (choice: FieldChoice) => void;
  onDeleteColumn: () => void;
}

export function FieldSelect({
  incompatibleSelectedOperationType,
  selectedColumn,
  filteredOperations,
  currentIndexPattern,
  fieldMap,
  onChoose,
  onDeleteColumn,
}: FieldSelectProps) {
  const fields = _.uniq(
    filteredOperations.reduce((list, op) => [...list, ...op.applicableFields], [] as string[])
  ).sort();

  function isCompatibleWithCurrentOperation(fieldName: string) {
    if (incompatibleSelectedOperationType) {
      return (
        operationDefinitionMap[incompatibleSelectedOperationType].getPossibleOperationsForField(
          fieldMap[fieldName]
        ).length > 0
      );
    }
    return (
      !selectedColumn ||
      (hasField(selectedColumn) &&
        operationDefinitionMap[selectedColumn.operationType].getPossibleOperationsForField(
          fieldMap[fieldName]
        ).length > 0)
    );
  }

  const isCurrentOperationApplicableWithoutField =
    !selectedColumn ||
    operationDefinitionMap[selectedColumn.operationType].getPossibleOperationsForDocument(
      currentIndexPattern
    ).length > 0;

  const fieldOptions = [];
  const fieldlessColumn = filteredOperations.find(op => op.applicableWithoutField);

  if (fieldlessColumn) {
    fieldOptions.push({
      label: i18n.translate('xpack.lens.indexPattern.documentField', {
        defaultMessage: 'Document',
      }),
      value: { type: 'document' },
      className: classNames({
        'lnsConfigPanel__fieldOption--incompatible': !isCurrentOperationApplicableWithoutField,
      }),
    });
  }

  if (fields.length > 0) {
    fieldOptions.push({
      label: i18n.translate('xpack.lens.indexPattern.individualFieldsLabel', {
        defaultMessage: 'Individual fields',
      }),
      options: fields
        .map(field => ({
          label: field,
          value: {
            type: 'document',
            field,
            dataType: fieldMap[field].type,
          },
          compatible: isCompatibleWithCurrentOperation(field),
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

        onChoose((choices[0] as unknown) as FieldChoice);
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
