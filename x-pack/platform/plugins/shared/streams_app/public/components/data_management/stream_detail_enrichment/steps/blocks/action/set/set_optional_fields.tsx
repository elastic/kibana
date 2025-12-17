/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { EuiCode, EuiFieldText, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ToggleField } from '../toggle_field';
import type { ExtractBooleanFields, ProcessorFormState } from '../../../../types';

export const OverrideField = () => {
  return (
    <ToggleField
      name={'override' as ExtractBooleanFields<ProcessorFormState>}
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.setOverrideLabel',
        { defaultMessage: 'Override' }
      )}
      helpText={
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.setOverrideHelpText"
          defaultMessage="If true, the processor will update fields with pre-existing non-null field values. If false, non-null fields are not updated."
        />
      }
    />
  );
};

export const IgnoreEmptyValueField = () => {
  return (
    <ToggleField
      name={'ignore_empty_value' as ExtractBooleanFields<ProcessorFormState>}
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.setIgnoreEmptyValueLabel',
        { defaultMessage: 'Ignore empty value' }
      )}
      helpText={
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.setIgnoreEmptyValueHelpText"
          defaultMessage="If true and {value} evaluates to null or an empty string, the processor quietly exits without modifying the document."
          values={{ value: <EuiCode>value</EuiCode> }}
        />
      }
    />
  );
};

export const MediaTypeField = () => {
  const { register } = useFormContext();
  const { ref, ...inputProps } = register('media_type');

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.setMediaTypeLabel',
        { defaultMessage: 'Media type' }
      )}
      helpText={
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.setMediaTypeHelpText"
          defaultMessage="The media type for encoding value. Applies only when {value} is a template snippet. Must be one of application/json, text/plain, or application/x-www-form-urlencoded."
          values={{ value: <EuiCode>value</EuiCode> }}
        />
      }
      fullWidth
    >
      <EuiFieldText {...inputProps} inputRef={ref} compressed={true} />
    </EuiFormRow>
  );
};
