/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useController } from 'react-hook-form';
import { ProcessorFormState } from '../types';

export const ProcessorFieldSelector = () => {
  const { field, fieldState } = useController<ProcessorFormState, 'field'>({
    name: 'field',
    rules: {
      required: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.fieldSelectorRequiredError',
        { defaultMessage: 'A field value is required.' }
      ),
    },
  });

  const { ref, ...inputProps } = field;
  const { invalid, error } = fieldState;

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.fieldSelectorLabel',
        { defaultMessage: 'Field' }
      )}
      helpText={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.fieldSelectorHelpText',
        { defaultMessage: 'Field to search for matches.' }
      )}
      isInvalid={invalid}
      error={error?.message}
    >
      <EuiFieldText
        data-test-subj="streamsAppProcessorFieldSelectorFieldText"
        {...inputProps}
        inputRef={ref}
        isInvalid={invalid}
      />
    </EuiFormRow>
  );
};
