/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useController, useWatch } from 'react-hook-form';
import { EuiButtonEmpty, EuiComboBox, EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { isEmpty } from 'lodash';
import { DateFormState, ProcessorFormState } from '../../types';

export const DateFormatsField = ({ onGenerate }: { onGenerate?: () => void }) => {
  const { field, fieldState } = useController<ProcessorFormState, 'formats'>({
    name: 'formats',
    rules: {
      required: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.dateFormatsRequiredError',
        { defaultMessage: 'A value for format is required.' }
      ),
    },
  });

  const fieldName = useWatch<DateFormState, 'field'>({ name: 'field' });

  const handleChange = (options: EuiComboBoxOptionOption[]) => {
    field.onChange(options.map((option) => option.label));
  };

  const handleCreateOption = (value: string) => {
    field.onChange([...field.value, value]);
  };

  const { invalid, error } = fieldState;
  const { ref, ...inputProps } = field;

  return (
    <EuiFormRow
      label={
        <span css={{ alignContent: 'flex-end', height: '100%', display: 'inline-block' }}>
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processor.dateFormatsLabel',
            { defaultMessage: 'Format' }
          )}
        </span>
      }
      labelAppend={
        onGenerate ? (
          <EuiButtonEmpty
            size="xs"
            onClick={onGenerate}
            iconType="refresh"
            iconSide="left"
            isDisabled={isEmpty(fieldName)}
          >
            <FormattedMessage
              id="xpack.streams.streamDetailView.managementTab.enrichment.processor.dateFormatsGenerateSuggestions"
              defaultMessage="Generate suggestions"
            />
          </EuiButtonEmpty>
        ) : undefined
      }
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
      <EuiComboBox
        {...inputProps}
        data-test-subj="input"
        fullWidth
        inputRef={ref}
        isInvalid={invalid}
        noSuggestions
        onCreateOption={handleCreateOption}
        onChange={handleChange}
        placeholder={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.dateFormatsPlaceholder',
          { defaultMessage: 'Type and then hit "ENTER"' }
        )}
        selectedOptions={field.value.map((label) => ({ label }))}
      />
    </EuiFormRow>
  );
};
