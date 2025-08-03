/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy } from 'lodash';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBoxOptionOption, EuiComboBoxProps } from '@elastic/eui';
import { useExistingFieldsReader } from '@kbn/unified-field-list/src/hooks/use_existing_fields';
import { FieldOption, FieldOptionValue, FieldPicker } from '@kbn/visualization-ui-components';
import { getFieldIconType } from '@kbn/field-utils';
import type { OperationType } from '../form_based';
import type { OperationSupportMatrix } from './operation_support';
import { fieldContainsData } from '../../../shared_components';
import type { IndexPattern } from '../../../types';

export type FieldChoiceWithOperationType = FieldOptionValue & {
  operationType: OperationType;
};

export interface FieldSelectProps extends EuiComboBoxProps<EuiComboBoxOptionOption['value']> {
  currentIndexPattern: IndexPattern;
  selectedOperationType?: OperationType;
  selectedField?: string;
  incompleteOperation?: OperationType;
  operationByField: OperationSupportMatrix['operationByField'];
  onChoose: (choice: FieldChoiceWithOperationType) => void;
  onDeleteColumn?: () => void;
  fieldIsInvalid: boolean;
  markAllFieldsCompatible?: boolean;
  'data-test-subj'?: string;
  showTimeSeriesDimensions: boolean;
}

export function FieldSelect({
  currentIndexPattern,
  incompleteOperation,
  selectedOperationType,
  selectedField,
  operationByField,
  onChoose,
  onDeleteColumn,
  fieldIsInvalid,
  markAllFieldsCompatible,
  ['data-test-subj']: dataTestSub,
  showTimeSeriesDimensions,
}: FieldSelectProps) {
  const { hasFieldData } = useExistingFieldsReader();
  const memoizedFieldOptions = useMemo(() => {
    const fields = [...operationByField.keys()].sort();

    // TODO: filter out here too once we have a way to know the used fields
    // and an instance to the original dataView

    const currentOperationType = incompleteOperation ?? selectedOperationType;

    function isCompatibleWithCurrentOperation(fieldName: string) {
      return !currentOperationType || operationByField.get(fieldName)!.has(currentOperationType);
    }

    function containsData(fieldName: string) {
      return fieldContainsData(fieldName, currentIndexPattern, hasFieldData);
    }

    const isTimeSeriesFields = (field: string) => {
      return (
        showTimeSeriesDimensions && currentIndexPattern.getFieldByName(field)?.timeSeriesDimension
      );
    };

    const {
      specialFields,
      metaFields,
      availableNonTimeseriesFields,
      availableTimeSeriesFields,
      emptyTimeSeriesFields,
      emptyNonTimeSeriesFields,
    } = groupBy(fields, (field) => {
      const fieldInstance = currentIndexPattern.getFieldByName(field);
      if (fieldInstance?.type === 'document') {
        return 'specialFields'; // Document fields are treated as special
      }
      if (fieldInstance?.meta) {
        return 'metaFields'; // Meta fields
      }
      if (isTimeSeriesFields(field)) {
        if (containsData(field)) {
          return 'availableTimeSeriesFields'; // Time series fields with data
        }
        return 'emptyTimeSeriesFields'; // Time series fields without data
      }
      if (containsData(field)) {
        return 'availableNonTimeseriesFields'; // Fields with data
      }
      return 'emptyNonTimeSeriesFields'; // Fields with no data
    });

    interface FieldOption {
      label: string;
      value: { type: 'field'; field: string; dataType: string | undefined; operationType: string };
      exists: boolean;
      compatible: number;
      'data-test-subj': string;
    }

    function fieldNamesToOptions(items: string[]): FieldOption[] {
      return items
        .filter((field) => currentIndexPattern.getFieldByName(field)?.displayName)
        .map((field) => {
          const compatible =
            markAllFieldsCompatible || isCompatibleWithCurrentOperation(field) ? 1 : 0;
          const exists = containsData(field);
          const fieldInstance = currentIndexPattern.getFieldByName(field);
          return {
            label: fieldInstance?.displayName ?? field,
            value: {
              type: 'field' as const,
              field,
              dataType: fieldInstance ? getFieldIconType(fieldInstance) : undefined,
              // Use the operation directly, or choose the first compatible operation.
              // All fields are guaranteed to have at least one operation because they
              // won't appear in the list otherwise
              operationType:
                currentOperationType && isCompatibleWithCurrentOperation(field)
                  ? currentOperationType
                  : operationByField.get(field)!.values().next().value, // TODO let's remove these non-null assertion, they are very dangerous
            },
            exists,
            compatible,
            'data-test-subj': `lns-fieldOption${compatible ? '' : 'Incompatible'}-${field}`,
          };
        })
        .sort((a, b) => b.compatible - a.compatible);
    }

    const constructFieldsOptions = (
      fieldsArr: string[],
      label: string
    ): { label: string; options: FieldOption[] } | false =>
      fieldsArr.length > 0 && {
        label,
        options: fieldNamesToOptions(fieldsArr),
      };

    const timeSeriesFieldsOptions = constructFieldsOptions(
      // This group includes both available and empty fields
      availableTimeSeriesFields.concat(emptyTimeSeriesFields),
      i18n.translate('xpack.lens.indexPattern.timeSeriesFieldsLabel', {
        defaultMessage: 'Time series dimensions',
      })
    );

    const availableFieldsOptions = constructFieldsOptions(
      availableNonTimeseriesFields,
      i18n.translate('xpack.lens.indexPattern.availableFieldsLabel', {
        defaultMessage: 'Available fields',
      })
    );

    const emptyFieldsOptions = constructFieldsOptions(
      emptyNonTimeSeriesFields,
      i18n.translate('xpack.lens.indexPattern.emptyFieldsLabel', {
        defaultMessage: 'Empty fields',
      })
    );

    const metaFieldsOptions = constructFieldsOptions(
      metaFields,
      i18n.translate('xpack.lens.indexPattern.metaFieldsLabel', {
        defaultMessage: 'Meta fields',
      })
    );

    return [
      ...fieldNamesToOptions(specialFields),
      timeSeriesFieldsOptions,
      availableFieldsOptions,
      emptyFieldsOptions,
      metaFieldsOptions,
    ].filter(Boolean);
  }, [
    operationByField,
    incompleteOperation,
    selectedOperationType,
    currentIndexPattern,
    hasFieldData,
    markAllFieldsCompatible,
    showTimeSeriesDimensions,
  ]);

  return (
    <FieldPicker<FieldChoiceWithOperationType>
      activeField={
        (selectedOperationType && selectedField
          ? {
              label:
                (selectedOperationType &&
                  selectedField &&
                  currentIndexPattern.getFieldByName(selectedField)?.displayName) ??
                selectedField,
              value: { type: 'field', field: selectedField },
            }
          : undefined) as unknown as FieldOption<FieldChoiceWithOperationType>
      }
      options={memoizedFieldOptions as Array<FieldOption<FieldChoiceWithOperationType>>}
      onChoose={(choice) => {
        if (choice && choice.field !== selectedField) {
          onChoose(choice);
        }
      }}
      onDelete={onDeleteColumn}
      fieldIsInvalid={Boolean(incompleteOperation || fieldIsInvalid)}
      data-test-subj={dataTestSub ?? 'indexPattern-dimension-field'}
    />
  );
}
