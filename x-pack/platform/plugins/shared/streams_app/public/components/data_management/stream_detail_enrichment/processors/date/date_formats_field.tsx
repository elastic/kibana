/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useController } from 'react-hook-form';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ProcessorFormState } from '../../types';

export const DateFormatsField = () => {
  const { field, fieldState } = useController<ProcessorFormState, 'formats'>({
    name: 'formats',
    rules: {
      required: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.dateFormatsRequiredError',
        { defaultMessage: 'A value for format is required.' }
      ),
    },
  });

  const { invalid, error } = fieldState;
  const { ref, ...inputProps } = field;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    field.onChange([e.target.value]);
  };

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.dateFormatsLabel',
        { defaultMessage: 'Format' }
      )}
      helpText={
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.dateFormatsHelpText"
          defaultMessage="Expected date format. Accepts a Java time pattern, ISO8601, UNIX, UNIX_MS, or TAI64N format."
        />
      }
      fullWidth
      isInvalid={invalid}
      error={error?.message}
    >
      <EuiFieldText {...inputProps} inputRef={ref} isInvalid={invalid} onChange={handleChange} />
    </EuiFormRow>
  );
};
