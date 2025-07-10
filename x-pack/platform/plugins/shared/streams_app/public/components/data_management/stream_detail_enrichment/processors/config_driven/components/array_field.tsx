/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBoxOptionOption, EuiComboBox, EuiFormRow } from '@elastic/eui';
import React from 'react';
import { useController } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { FieldConfiguration } from '../types';

export const ArrayField = ({ fieldConfiguration }: { fieldConfiguration: FieldConfiguration }) => {
  const { field: fieldName, label, helpText, required } = fieldConfiguration;

  const { field, fieldState } = useController({
    name: fieldName,
    rules: {
      ...(required
        ? {
            required: i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processor.arrayFieldRequiredError',
              { defaultMessage: 'A value for {fieldName} is required.', values: { fieldName } }
            ),
          }
        : {}),
    },
  });

  const { invalid, error } = fieldState;

  const handleChange = (options: EuiComboBoxOptionOption[]) => {
    field.onChange(options.map((option) => option.label));
  };

  const handleCreate = (value: string) => {
    const newValue = [...field.value, value];
    field.onChange(newValue);
  };

  return (
    <EuiFormRow
      label={label}
      helpText={helpText}
      fullWidth
      isInvalid={invalid}
      error={error?.message}
    >
      <EuiComboBox
        fullWidth
        noSuggestions
        inputRef={field.ref}
        placeholder={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.arrayFieldPlaceholder',
          { defaultMessage: 'Type and then hit "ENTER"' }
        )}
        selectedOptions={(field.value as string[]).map((v) => ({ label: v }))}
        onCreateOption={handleCreate}
        onChange={handleChange}
      />
    </EuiFormRow>
  );
};
