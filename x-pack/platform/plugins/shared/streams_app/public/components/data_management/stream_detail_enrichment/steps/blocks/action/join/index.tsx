/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiComboBox, EuiFieldText, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useController } from 'react-hook-form';
import { useEnrichmentFieldSuggestions } from '../../../../../../../hooks/use_field_suggestions';
import { JoinTargetFieldSelector } from './target_field';
import { FieldsAccordion } from '../optional_fields_accordion';
import { ProcessorConditionEditor } from '../processor_condition_editor';
import { IgnoreFailureToggle, IgnoreMissingToggle } from '../ignore_toggles';
import type { JoinFormState } from '../../../../types';

export const JoinProcessorForm = () => {
  const { field: delimiterField } = useController<JoinFormState, 'delimiter'>({
    name: 'delimiter',
  });
  const { field: fromFields, fieldState } = useController<JoinFormState, 'from'>({
    name: 'from',
    rules: {
      required: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.joinFieldsSelectorRequired',
        { defaultMessage: 'At least one field must be selected.' }
      ),
    },
  });
  const fieldSuggestions = useEnrichmentFieldSuggestions();

  return (
    <>
      <EuiFormRow
        label={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.joinFieldsSelectorLabel',
          { defaultMessage: 'Field(s)' }
        )}
        isInvalid={fieldState.invalid}
        error={fieldState.error?.message}
      >
        <EuiComboBox
          isClearable
          options={fieldSuggestions.map((fieldSuggestion) => ({ label: fieldSuggestion.name }))}
          selectedOptions={fromFields.value.map((field) => ({ label: field }))}
          onChange={(options) => fromFields.onChange(options.map((option) => option.label))}
          fullWidth
          isInvalid={fieldState.invalid}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.joinDelimiterLabel',
          { defaultMessage: 'Delimiter' }
        )}
        fullWidth
      >
        <EuiFieldText {...delimiterField} />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <JoinTargetFieldSelector />
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
