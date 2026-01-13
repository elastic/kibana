/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DragDropContextProps } from '@elastic/eui';
import {
  EuiButton,
  EuiDraggable,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import { SortableList } from '../../../../sortable_list';
import type { ConcatFormState } from '../../../../types';
import { ProcessorFieldSelector } from '../processor_field_selector';

interface DraggableConcatInputProps {
  id: string;
  index: number;
}

const DraggableConcatFieldInput = ({ id, index }: DraggableConcatInputProps) => {
  return (
    <EuiDraggable draggableId={id} index={index}>
      <ProcessorFieldSelector
        fieldKey={`from.${index}.value`}
        label={i18n.translate('xpack.streams.draggableConcatFieldInput.fieldLabel', {
          defaultMessage: 'Field',
        })}
      />
    </EuiDraggable>
  );
};

const DraggableConcatTextInput = ({ id, index }: DraggableConcatInputProps) => {
  const { control } = useFormContext();

  return (
    <EuiDraggable draggableId={id} index={index}>
      <Controller
        control={control}
        name={`from.${index}.value`}
        rules={{
          minLength: {
            value: 1,
            message: i18n.translate('xpack.streams.draggableConcatTextInput.textRequiredError', {
              defaultMessage: 'Text cannot be empty.',
            }),
          },
          validate: (value) => {
            if (value === '') {
              return i18n.translate('xpack.streams.draggableConcatTextInput.textRequiredError', {
                defaultMessage: 'Text cannot be empty.',
              });
            }
            return true;
          },
        }}
        render={({ field, fieldState }) => (
          <EuiFormRow
            label={i18n.translate('xpack.streams.draggableConcatTextInput.textLabel', {
              defaultMessage: 'Text',
            })}
            isInvalid={fieldState.invalid}
            error={fieldState.error?.message}
          >
            <EuiFieldText value={field.value} onChange={field.onChange} />
          </EuiFormRow>
        )}
      />
    </EuiDraggable>
  );
};

export const ConcatFromBuilder = () => {
  const { fields, append, remove, move } = useFieldArray<Pick<ConcatFormState, 'from'>>({
    name: 'from',
  });

  const handleAddField = () => {
    append({ type: 'field', value: '' });
  };

  const handleAddText = () => {
    append({ type: 'literal', value: ' ' });
  };

  const handleFromBuilderDrag: DragDropContextProps['onDragEnd'] = ({ source, destination }) => {
    if (source && destination) {
      move(source.index, destination.index);
    }
  };

  return (
    <>
      <EuiFormRow
        label={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.concatFromBuilderLabel',
          { defaultMessage: 'Combine elements to build the final value' }
        )}
      >
        <SortableList onDragItem={handleFromBuilderDrag}>
          {fields.map((field, index) =>
            field.type === 'field' ? (
              <DraggableConcatFieldInput key={field.id} id={field.id} index={index} />
            ) : (
              <DraggableConcatTextInput key={field.id} id={field.id} index={index} />
            )
          )}
        </SortableList>
      </EuiFormRow>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButton color="text" iconType="plus" size="s" onClick={handleAddField}>
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processor.concatFromBuilderAddFieldLabel',
              { defaultMessage: 'Add field' }
            )}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton color="text" iconType="plus" size="s" onClick={handleAddText}>
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processor.concatFromBuilderAddTextLabel',
              { defaultMessage: 'Add text' }
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
