/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DragDropContextProps } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonIcon,
  EuiDraggable,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiSuperSelect,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FieldNameWithIcon } from '@kbn/react-field';
import React from 'react';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import { useEnrichmentFieldSuggestions } from '../../../../../../../hooks/use_field_suggestions';
import { SortableList } from '../../../../sortable_list';
import type { ConcatFormState } from '../../../../types';

interface DraggableConcatInputProps {
  index: number;
}

const DraggableConcatFieldInput = ({ index }: DraggableConcatInputProps) => {
  const { control } = useFormContext();
  const fieldSuggestions = useEnrichmentFieldSuggestions();
  const options = fieldSuggestions.map((suggestion) => ({
    value: suggestion.name,
    inputDisplay: <FieldNameWithIcon name={suggestion.name} type={suggestion.type} />,
  }));

  return (
    <Controller
      control={control}
      name={`from.${index}.value`}
      rules={{
        required: {
          value: true,
          message: i18n.translate('xpack.streams.draggableConcatFieldInput.fieldRequiredError', {
            defaultMessage: 'Field is required.',
          }),
        },
      }}
      render={({ field, fieldState }) => (
        <EuiFormRow
          aria-label={i18n.translate('xpack.streams.draggableConcatFieldInput.fieldLabel', {
            defaultMessage: 'Field',
          })}
          isInvalid={fieldState.invalid}
          error={fieldState.error?.message}
        >
          <EuiSuperSelect
            options={options}
            valueOfSelected={field.value}
            onChange={field.onChange}
            prepend={i18n.translate('xpack.streams.draggableConcatFieldInput.fieldLabel', {
              defaultMessage: 'Field',
            })}
            placeholder={i18n.translate(
              'xpack.streams.draggableConcatFieldInput.fieldPlaceholder',
              {
                defaultMessage: 'Select a field',
              }
            )}
            isInvalid={fieldState.invalid}
            fullWidth
            data-test-subj="streamsAppConcatFieldInput"
          />
        </EuiFormRow>
      )}
    />
  );
};

const DraggableConcatTextInput = ({ index }: DraggableConcatInputProps) => {
  const { control } = useFormContext();

  return (
    <Controller
      control={control}
      name={`from.${index}.value`}
      rules={{
        required: {
          value: true,
          message: i18n.translate('xpack.streams.draggableConcatTextInput.textRequiredError', {
            defaultMessage: 'Text is required.',
          }),
        },
      }}
      render={({ field, fieldState }) => (
        <EuiFormRow isInvalid={fieldState.invalid} error={fieldState.error?.message}>
          <EuiFieldText
            value={field.value}
            onChange={field.onChange}
            isInvalid={fieldState.invalid}
            prepend={i18n.translate('xpack.streams.draggableConcatTextInput.textLabel', {
              defaultMessage: 'Text',
            })}
            placeholder={i18n.translate('xpack.streams.draggableConcatTextInput.textPlaceholder', {
              defaultMessage: 'Enter a literal value',
            })}
            fullWidth
            data-test-subj="streamsAppConcatLiteralInput"
          />
        </EuiFormRow>
      )}
    />
  );
};

interface FromBuilderItemProps {
  type: ConcatFormState['from'][number]['type'];
  id: string;
  index: number;
  onRemove: (index: number) => void;
}

const FromBuilderItem = ({ type, id, index, onRemove }: FromBuilderItemProps) => {
  return (
    <EuiDraggable
      draggableId={id}
      index={index}
      customDragHandle={true}
      hasInteractiveChildren={true}
    >
      {(provided) => (
        <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiPanel
              color="transparent"
              paddingSize="s"
              {...provided.dragHandleProps}
              aria-label={i18n.translate('xpack.streams.fromBuilderItem.dragHandleLabel', {
                defaultMessage: 'Drag Handle',
              })}
            >
              <EuiIcon type="grab" />
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            {type === 'field' ? (
              <DraggableConcatFieldInput index={index} />
            ) : (
              <DraggableConcatTextInput index={index} />
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="trash"
              color="danger"
              size="m"
              aria-label={i18n.translate('xpack.streams.fromBuilderItem.removeLabel', {
                defaultMessage: 'Remove',
              })}
              onClick={() => onRemove(index)}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
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
    append({ type: 'literal', value: '' });
  };

  const handleRemove = (index: number) => {
    remove(index);
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
          <EuiFlexGroup direction="column" gutterSize="s">
            {fields.map((field, index) => (
              <EuiFlexItem key={field.id}>
                <FromBuilderItem
                  type={field.type}
                  id={field.id}
                  index={index}
                  onRemove={handleRemove}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </SortableList>
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButton
            color="text"
            iconType="plus"
            size="s"
            onClick={handleAddField}
            data-test-subj="streamsAppConcatAddFieldButton"
          >
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processor.concatFromBuilderAddFieldLabel',
              { defaultMessage: 'Add field' }
            )}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            color="text"
            iconType="plus"
            size="s"
            onClick={handleAddText}
            data-test-subj="streamsAppConcatAddLiteralButton"
          >
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processor.concatFromBuilderAddTextLabel',
              { defaultMessage: 'Add text' }
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
    </>
  );
};
