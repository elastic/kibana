/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCode,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiSuperSelect,
} from '@elastic/eui';
import { useController, useFieldArray, useFormContext } from 'react-hook-form';
import { FieldNameWithIcon } from '@kbn/react-field';
import { capitalize } from 'lodash';
import { jsonExtractTypes } from '@kbn/streamlang';
import { ProcessorFieldSelector } from '../processor_field_selector';
import { FieldsAccordion } from '../optional_fields_accordion';
import { IgnoreFailureToggle, IgnoreMissingToggle } from '../ignore_toggles';
import { ProcessorConditionEditor } from '../processor_condition_editor';
import type { JsonExtractFormState } from '../../../../types';

const typeOptions = jsonExtractTypes.map((type) => ({
  value: type,
  inputDisplay: <FieldNameWithIcon name={capitalize(type)} type={type} />,
}));

export const JsonExtractProcessorForm = () => {
  const { control } = useFormContext<JsonExtractFormState>();
  const { fields, append, remove } = useFieldArray<JsonExtractFormState, 'extractions'>({
    control,
    name: 'extractions',
    rules: {
      minLength: {
        value: 1,
        message: i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.jsonExtractExtractionsMinLengthError',
          { defaultMessage: 'At least one extraction is required.' }
        ),
      },
    },
  });

  useEffect(() => {
    if (fields.length === 0) {
      append({ selector: '', target_field: '', type: 'keyword' });
    }
  }, [fields.length, append]);

  return (
    <>
      <ProcessorFieldSelector
        fieldKey="field"
        helpText={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.jsonExtractFieldHelpText',
          { defaultMessage: 'The field containing the JSON string to parse.' }
        )}
      />
      <EuiFormRow
        label={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.jsonExtractExtractionsLabel',
          { defaultMessage: 'Extractions' }
        )}
        helpText={
          <FormattedMessage
            id="xpack.streams.streamDetailView.managementTab.enrichment.processor.jsonExtractExtractionsHelpText"
            defaultMessage="Define which values to extract using JSONPath-like selectors. Examples: {example1}, {example2}, {example3}"
            values={{
              example1: <EuiCode>user.id</EuiCode>,
              example2: <EuiCode>$.metadata.client.ip</EuiCode>,
              example3: <EuiCode>items[0].name</EuiCode>,
            }}
          />
        }
        fullWidth
      >
        <div>
          {fields.map((field, index) => (
            <ExtractionField
              key={field.id}
              index={index}
              onRemove={() => remove(index)}
              canRemove={fields.length > 1}
            />
          ))}
          <EuiButtonEmpty
            iconType="plusInCircle"
            onClick={() => append({ selector: '', target_field: '', type: 'keyword' })}
            size="xs"
            data-test-subj="streamsAppJsonExtractAddExtractionButton"
          >
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processor.jsonExtractAddExtraction',
              { defaultMessage: 'Add extraction' }
            )}
          </EuiButtonEmpty>
        </div>
      </EuiFormRow>
      <EuiSpacer size="m" />
      <FieldsAccordion>
        <ProcessorConditionEditor />
      </FieldsAccordion>
      <EuiSpacer size="m" />
      <IgnoreFailureToggle />
      <IgnoreMissingToggle />
    </>
  );
};

interface ExtractionFieldProps {
  index: number;
  onRemove: () => void;
  canRemove: boolean;
}

const ExtractionField = ({ index, onRemove, canRemove }: ExtractionFieldProps) => {
  const { field: selectorField, fieldState: selectorFieldState } = useController<
    JsonExtractFormState,
    `extractions.${number}.selector`
  >({
    name: `extractions.${index}.selector`,
    rules: {
      required: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.jsonExtractSelectorRequiredError',
        { defaultMessage: 'Selector is required.' }
      ),
      validate: (value: string) => {
        if (value.includes('{{')) {
          return i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processor.jsonExtractSelectorMustacheError',
            {
              defaultMessage:
                "Mustache template syntax '{{' '}}' or '{{{' '}}}' is not allowed in selectors",
            }
          );
        }
        return true;
      },
    },
  });

  const { field: targetField, fieldState: targetFieldState } = useController<
    JsonExtractFormState,
    `extractions.${number}.target_field`
  >({
    name: `extractions.${index}.target_field`,
    rules: {
      required: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.jsonExtractTargetFieldRequiredError',
        { defaultMessage: 'Target field is required.' }
      ),
      validate: (value: string) => {
        if (value.includes('{{')) {
          return i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processor.jsonExtractTargetFieldMustacheError',
            {
              defaultMessage:
                "Mustache template syntax '{{' '}}' or '{{{' '}}}' is not allowed in target fields",
            }
          );
        }
        return true;
      },
    },
  });

  const { field: typeField } = useController<JsonExtractFormState, `extractions.${number}.type`>({
    name: `extractions.${index}.type`,
    defaultValue: 'keyword',
  });

  const { ref: selectorRef, ...selectorInputProps } = selectorField;
  const { ref: targetRef, ...targetInputProps } = targetField;

  return (
    <EuiPanel paddingSize="s" hasShadow={false} hasBorder style={{ marginBottom: 8 }}>
      <EuiFlexGroup gutterSize="s" alignItems="flexStart">
        <EuiFlexItem grow={4}>
          <EuiFormRow
            label={i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processor.jsonExtractSelectorLabel',
              { defaultMessage: 'Selector' }
            )}
            isInvalid={selectorFieldState.invalid}
            error={selectorFieldState.error?.message}
            fullWidth
          >
            <EuiFieldText
              placeholder={i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.processor.jsonExtractSelectorPlaceholder',
                { defaultMessage: 'e.g., user.id or $.data[0].value' }
              )}
              isInvalid={selectorFieldState.invalid}
              {...selectorInputProps}
              inputRef={selectorRef}
              fullWidth
              compressed
              data-test-subj={`streamsAppJsonExtractSelectorInput-${index}`}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={4}>
          <EuiFormRow
            label={i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processor.jsonExtractTargetFieldLabel',
              { defaultMessage: 'Target field' }
            )}
            isInvalid={targetFieldState.invalid}
            error={targetFieldState.error?.message}
            fullWidth
          >
            <EuiFieldText
              placeholder={i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.processor.jsonExtractTargetFieldPlaceholder',
                { defaultMessage: 'e.g., extracted.user_id' }
              )}
              isInvalid={targetFieldState.invalid}
              {...targetInputProps}
              inputRef={targetRef}
              fullWidth
              compressed
              data-test-subj={`streamsAppJsonExtractTargetFieldInput-${index}`}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <EuiFormRow
            label={i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processor.jsonExtractTypeLabel',
              { defaultMessage: 'Type' }
            )}
            fullWidth
          >
            <EuiSuperSelect
              options={typeOptions}
              valueOfSelected={typeField.value ?? 'keyword'}
              onChange={typeField.onChange}
              compressed
              fullWidth
              data-test-subj={`streamsAppJsonExtractTypeSelect-${index}`}
              aria-label={i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.processor.jsonExtractTypeAriaLabel',
                { defaultMessage: 'Extraction type' }
              )}
            />
          </EuiFormRow>
        </EuiFlexItem>
        {canRemove && (
          <EuiFlexItem grow={false} style={{ alignSelf: 'flex-end', marginBottom: 4 }}>
            <EuiButtonIcon
              iconType="trash"
              color="danger"
              onClick={onRemove}
              aria-label={i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.processor.jsonExtractRemoveExtraction',
                { defaultMessage: 'Remove extraction' }
              )}
              data-test-subj={`streamsAppJsonExtractRemoveExtractionButton-${index}`}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
