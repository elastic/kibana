/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { EuiCode, EuiComboBox, EuiFieldText, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ProcessorFormState } from '../../types';

export const DateFormatsField = () => {
  const { register } = useFormContext();
  const { ref, ...inputProps } = register(`formats`);

  const { field, fieldState } = useController<ProcessorFormState, 'formats'>({
    name: 'formats',
    rules: {
      required: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.dateFormatsRequiredError',
        { defaultMessage: 'A value for formats is required.' }
      ),
    },
  });

  const { invalid, error } = fieldState;

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.dateFormatsLabel',
        { defaultMessage: 'Append separator' }
      )}
      helpText={
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.dateFormatsHelpText"
          defaultMessage="Expected date formats. Provided formats are applied sequentially. Accepts a Java time pattern, ISO8601, UNIX, UNIX_MS, or TAI64N formats. Defaults to {value}."
          values={{ value: <EuiCode>{"yyyy-MM-dd'T'HH:mm:ss.SSSXX"}</EuiCode> }}
        />
      }
      fullWidth
    >
      <EuiFieldText {...inputProps} inputRef={ref} />
      <EuiComboBox
        aria-label="Accessible screen reader label"
        placeholder="Select or create options"
        options={[
          {
            label: 'Titan',
          },
        ]}
        onChange={onChange}
        onCreateOption={onCreateOption}
        isClearable={true}
      />
    </EuiFormRow>
  );
};
