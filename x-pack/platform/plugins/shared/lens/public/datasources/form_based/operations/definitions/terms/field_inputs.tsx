/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { htmlIdGenerator } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  DragDropBuckets,
  FieldsBucketContainer,
  NewBucketButton,
  DraggableBucketContainer,
} from '@kbn/visualization-ui-components';
import { useDebouncedValue } from '@kbn/visualization-utils';
import { IndexPattern } from '../../../../../types';
import { FieldChoiceWithOperationType, FieldSelect } from '../../../dimension_panel/field_select';
import type { TermsIndexPatternColumn } from './types';
import type { OperationSupportMatrix } from '../../../dimension_panel';
import { supportedTypes } from './constants';

const generateId = htmlIdGenerator();
export const MAX_MULTI_FIELDS_SIZE = 3;

export interface FieldInputsProps {
  column: TermsIndexPatternColumn;
  indexPattern: IndexPattern;
  invalidFields?: string[];
  operationSupportMatrix: Pick<OperationSupportMatrix, 'operationByField'>;
  onChange: (newValues: string[]) => void;
  showTimeSeriesDimensions: boolean;
}

interface WrappedValue {
  id: string;
  value: string | undefined;
  isNew?: boolean;
}

type SafeWrappedValue = Omit<WrappedValue, 'value'> & { value: string };

function removeNewEmptyField(v: WrappedValue): v is SafeWrappedValue {
  return v.value != null;
}

export function FieldInputs({
  column,
  onChange,
  indexPattern,
  operationSupportMatrix,
  invalidFields,
  showTimeSeriesDimensions,
}: FieldInputsProps) {
  const onChangeWrapped = useCallback(
    (values: WrappedValue[]) =>
      onChange(values.filter(removeNewEmptyField).map(({ value }) => value)),
    [onChange]
  );
  const { wrappedValues, rawValuesLookup } = useMemo(() => {
    const rawValues = column ? [column.sourceField, ...(column.params?.secondaryFields || [])] : [];
    return {
      wrappedValues: rawValues.map((value) => ({ id: generateId(), value })),
      rawValuesLookup: new Set(rawValues),
    };
  }, [column]);

  const { inputValue: localValues, handleInputChange } = useDebouncedValue<WrappedValue[]>({
    onChange: onChangeWrapped,
    value: wrappedValues,
  });

  const onFieldSelectChange = useCallback(
    (choice: FieldChoiceWithOperationType, index = 0) => {
      const fields = [...localValues];

      if (indexPattern.getFieldByName(choice.field)) {
        fields[index] = { id: generateId(), value: choice.field };

        // update the layer state
        handleInputChange(fields);
      }
    },
    [localValues, indexPattern, handleInputChange]
  );

  const disableActions =
    localValues.length === 1 || localValues.filter(({ isNew }) => !isNew).length < 2;
  const localValuesFilled = localValues.filter(({ isNew }) => !isNew);
  return (
    <>
      <DragDropBuckets
        onDragEnd={(updatedValues: WrappedValue[]) => {
          handleInputChange(updatedValues);
        }}
        droppableId="TOP_TERMS_DROPPABLE_AREA"
        items={localValues}
        bgColor="subdued"
      >
        {localValues.map(({ id, value, isNew }, index, arrayRef) => {
          // need to filter the available fields for multiple terms
          // * a scripted field should be removed
          // * a field of unsupported type should be removed
          // * a field that has been used
          // * a scripted field was used in a singular term, should be marked as invalid for multi-terms
          const filteredOperationByField = [...operationSupportMatrix.operationByField.keys()]
            .filter((key) => {
              if (key === value) {
                return true;
              }
              const field = indexPattern.getFieldByName(key);
              if (index === 0) {
                return !rawValuesLookup.has(key) && field && supportedTypes.has(field.type);
              } else {
                return (
                  !rawValuesLookup.has(key) &&
                  field &&
                  !field.scripted &&
                  supportedTypes.has(field.type)
                );
              }
            })
            .reduce<OperationSupportMatrix['operationByField']>((memo, key) => {
              const fieldOps = operationSupportMatrix.operationByField.get(key);
              if (fieldOps) {
                memo.set(key, fieldOps);
              }
              return memo;
            }, new Map());

          const shouldShowError = Boolean(
            value &&
              ((indexPattern.getFieldByName(value)?.scripted && localValuesFilled.length > 1) ||
                invalidFields?.includes(value))
          );
          const itemId = (value ?? 'newField') + id;

          return (
            <DraggableBucketContainer
              id={itemId}
              key={itemId}
              idx={index}
              onRemoveClick={() => {
                handleInputChange(arrayRef.filter((_, i) => i !== index));
              }}
              removeTitle={i18n.translate('xpack.lens.indexPattern.terms.deleteButtonLabel', {
                defaultMessage: 'Delete',
              })}
              isNotRemovable={disableActions && !isNew}
              isNotDraggable={arrayRef.length < 2}
              data-test-subj={`indexPattern-terms`}
              Container={FieldsBucketContainer}
              isInsidePanel={true}
            >
              <FieldSelect
                fieldIsInvalid={shouldShowError}
                currentIndexPattern={indexPattern}
                operationByField={filteredOperationByField}
                selectedOperationType={column.operationType}
                selectedField={value}
                autoFocus={isNew}
                onChoose={(choice) => {
                  onFieldSelectChange(choice, index);
                }}
                isInvalid={shouldShowError}
                data-test-subj={
                  localValues.length !== 1 ? `indexPattern-dimension-field-${index}` : undefined
                }
                showTimeSeriesDimensions={localValues.length < 2 && showTimeSeriesDimensions}
              />
            </DraggableBucketContainer>
          );
        })}
      </DragDropBuckets>
      <NewBucketButton
        onClick={() => {
          handleInputChange([...localValues, { id: generateId(), value: undefined, isNew: true }]);
        }}
        data-test-subj={`indexPattern-terms-add-field`}
        label={i18n.translate('xpack.lens.indexPattern.terms.addaFilter', {
          defaultMessage: 'Add field',
        })}
        isDisabled={
          column.params.orderBy.type === 'rare' ||
          column.params.orderBy.type === 'significant' ||
          localValues.length > MAX_MULTI_FIELDS_SIZE
        }
      />
    </>
  );
}

export function getInputFieldErrorMessage(isScriptedField: boolean, invalidFields: string[]) {
  if (isScriptedField) {
    return i18n.translate('xpack.lens.indexPattern.terms.scriptedFieldErrorShort', {
      defaultMessage: 'Scripted fields are not supported when using multiple fields',
    });
  }
  if (invalidFields.length) {
    return i18n.translate('xpack.lens.indexPattern.terms.invalidFieldsErrorShort', {
      defaultMessage:
        'Invalid {invalidFieldsCount, plural, one {field} other {fields}}: {invalidFields}. Check your data view or pick another field.',
      values: {
        invalidFieldsCount: invalidFields.length,
        invalidFields: invalidFields.map((fieldName) => `"${fieldName}"`).join(', '),
      },
    });
  }
}
