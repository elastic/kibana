/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useController } from 'react-hook-form';
import { EuiCode, EuiComboBox, EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ProcessorFormState } from '../../types';

export const DateFormatsField = () => {
  const { field, fieldState } = useController<ProcessorFormState, 'formats'>({
    name: 'formats',
    rules: {
      required: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.dateFormatsRequiredError',
        { defaultMessage: 'A value for formats is required.' }
      ),
    },
  });

  const handleChange = (options: EuiComboBoxOptionOption[]) => {
    field.onChange(options.map((option) => option.label));
  };

  const handleCreate = (value: string) => {
    const newValue = [...field.value, value];

    field.onChange(newValue);
  };

  const { invalid, error } = fieldState;

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.dateFormatsLabel',
        { defaultMessage: 'Formats' }
      )}
      helpText={
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.dateFormatsHelpText"
          defaultMessage="Expected date formats. Provided formats are applied sequentially. Accepts a Java time pattern, ISO8601, UNIX, UNIX_MS, or TAI64N formats. Defaults to {value}."
          values={{ value: <EuiCode>yyyy-MM-ddTHH:mm:ss.SSSXX</EuiCode> }}
        />
      }
      fullWidth
      isInvalid={invalid}
      error={error?.message}
    >
      <EuiComboBox
        fullWidth
        noSuggestions
        inputRef={field.ref}
        placeholder={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.dateFormatsPlaceholder',
          { defaultMessage: 'Type and then hit "ENTER"' }
        )}
        selectedOptions={(field.value as string[]).map((v) => ({ label: v }))}
        onCreateOption={handleCreate}
        onChange={handleChange}
      />
    </EuiFormRow>
  );
};
