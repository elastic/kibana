/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBox, EuiFlexGroup, EuiFlexItem, EuiComboBoxOptionProps } from '@elastic/eui';
import classNames from 'classnames';
import { EuiHighlight } from '@elastic/eui';
import { OperationType } from '../indexpattern';
import { LensFieldIcon } from '../lens_field_icon';
import { DataType } from '../../types';
import { OperationFieldSupportMatrix } from './dimension_panel';
import { IndexPattern, IndexPatternField, IndexPatternPrivateState } from '../types';
import { trackUiEvent } from '../../lens_ui_telemetry';
import { fieldExists } from '../pure_helpers';

export interface FieldChoice {
  type: 'field';
  field: string;
  operationType?: OperationType;
}

export interface FieldSelectProps {
  currentIndexPattern: IndexPattern;
  showEmptyFields: boolean;
  fieldMap: Record<string, IndexPatternField>;
  incompatibleSelectedOperationType: OperationType | null;
  selectedColumnOperationType?: OperationType;
  selectedColumnSourceField?: string;
  operationFieldSupportMatrix: OperationFieldSupportMatrix;
  onChoose: (choice: FieldChoice) => void;
  onDeleteColumn: () => void;
  existingFields: IndexPatternPrivateState['existingFields'];
}

export function FieldSelect({
  currentIndexPattern,
  showEmptyFields,
  fieldMap,
  incompatibleSelectedOperationType,
  selectedColumnOperationType,
  selectedColumnSourceField,
  operationFieldSupportMatrix,
  onChoose,
  onDeleteColumn,
  existingFields,
}: FieldSelectProps) {
  const { operationByField } = operationFieldSupportMatrix;
  const memoizedFieldOptions = useMemo(() => {
    const fields = Object.keys(operationByField).sort();

    function isCompatibleWithCurrentOperation(fieldName: string) {
      if (incompatibleSelectedOperationType) {
        return operationByField[fieldName]!.includes(incompatibleSelectedOperationType);
      }
      return (
        !selectedColumnOperationType ||
        operationByField[fieldName]!.includes(selectedColumnOperationType)
      );
    }

    const [specialFields, normalFields] = _.partition(
      fields,
      field => fieldMap[field].type === 'document'
    );

    function fieldNamesToOptions(items: string[]) {
      return items
        .map(field => ({
          label: field,
          value: {
            type: 'field',
            field,
            dataType: fieldMap[field].type,
            operationType:
              selectedColumnOperationType && isCompatibleWithCurrentOperation(field)
                ? selectedColumnOperationType
                : undefined,
          },
          exists:
            fieldMap[field].type === 'document' ||
            fieldExists(existingFields, currentIndexPattern.title, field),
          compatible: isCompatibleWithCurrentOperation(field),
        }))
        .filter(field => showEmptyFields || field.exists)
        .sort((a, b) => {
          if (a.compatible && !b.compatible) {
            return -1;
          }
          if (!a.compatible && b.compatible) {
            return 1;
          }
          return 0;
        })
        .map(({ label, value, compatible, exists }) => ({
          label,
          value,
          className: classNames({
            'lnFieldSelect__option--incompatible': !compatible,
            'lnFieldSelect__option--nonExistant': !exists,
          }),
          'data-test-subj': `lns-fieldOption${compatible ? '' : 'Incompatible'}-${label}`,
        }));
    }

    const fieldOptions: unknown[] = fieldNamesToOptions(specialFields);

    if (fields.length > 0) {
      fieldOptions.push({
        label: i18n.translate('xpack.lens.indexPattern.individualFieldsLabel', {
          defaultMessage: 'Individual fields',
        }),
        options: fieldNamesToOptions(normalFields),
      });
    }

    return fieldOptions;
  }, [
    incompatibleSelectedOperationType,
    selectedColumnOperationType,
    selectedColumnSourceField,
    operationFieldSupportMatrix,
    currentIndexPattern,
    fieldMap,
    showEmptyFields,
  ]);

  return (
    <EuiComboBox
      fullWidth
      compressed
      isClearable={false}
      data-test-subj="indexPattern-dimension-field"
      placeholder={i18n.translate('xpack.lens.indexPattern.fieldPlaceholder', {
        defaultMessage: 'Field',
      })}
      options={(memoizedFieldOptions as unknown) as EuiComboBoxOptionProps[]}
      isInvalid={Boolean(incompatibleSelectedOperationType && selectedColumnOperationType)}
      selectedOptions={
        selectedColumnOperationType
          ? selectedColumnSourceField
            ? [
                {
                  label: selectedColumnSourceField,
                  value: { type: 'field', field: selectedColumnSourceField },
                },
              ]
            : [memoizedFieldOptions[0]]
          : []
      }
      singleSelection={{ asPlainText: true }}
      onChange={choices => {
        if (choices.length === 0) {
          onDeleteColumn();
          return;
        }

        trackUiEvent('indexpattern_dimension_field_changed');

        onChoose((choices[0].value as unknown) as FieldChoice);
      }}
      renderOption={(option, searchValue) => {
        return (
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={null}>
              <LensFieldIcon
                type={((option.value as unknown) as { dataType: DataType }).dataType}
              />
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
