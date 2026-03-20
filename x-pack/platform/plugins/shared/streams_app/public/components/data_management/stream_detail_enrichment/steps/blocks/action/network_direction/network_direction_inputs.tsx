/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiFormRow, EuiSuperSelect } from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import { FieldNameWithIcon } from '@kbn/react-field';
import { useEnrichmentFieldSuggestions } from '../../../../../../../hooks/use_field_suggestions';
import { ProcessorFieldSelector } from '../processor_field_selector';

interface IpRequiredFieldProps {
  name: string;
  label: string;
  dataTestSubj: string;
}

const IpRequiredField = ({ name, label, dataTestSubj }: IpRequiredFieldProps) => {
  const { control } = useFormContext();
  const fieldSuggestions = useEnrichmentFieldSuggestions();
  const options = fieldSuggestions.map((suggestion) => ({
    value: suggestion.name,
    inputDisplay: <FieldNameWithIcon name={suggestion.name} type={suggestion.type} />,
  }));

  return (
    <Controller
      control={control}
      name={name}
      rules={{
        required: {
          value: true,
          message: i18n.translate('xpack.streams.ipRequiredField.fieldRequiredError', {
            defaultMessage: 'Field is required.',
          }),
        },
      }}
      render={({ field, fieldState }) => (
        <EuiFormRow label={label} isInvalid={fieldState.invalid} error={fieldState.error?.message}>
          <EuiSuperSelect
            options={options}
            valueOfSelected={field.value}
            onChange={field.onChange}
            placeholder={i18n.translate('xpack.streams.ipRequiredField.fieldPlaceholder', {
              defaultMessage: 'Select a field',
            })}
            isInvalid={fieldState.invalid}
            fullWidth
            data-test-subj={dataTestSubj}
          />
        </EuiFormRow>
      )}
    />
  );
};

export const SourceIpField = () => {
  return (
    <IpRequiredField
      name="source_ip"
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.networkDirectionSourceIpLabel',
        { defaultMessage: 'Source IP field' }
      )}
      dataTestSubj="streamsAppSourceIpField"
    />
  );
};

export const DestinationIpField = () => {
  return (
    <IpRequiredField
      name="destination_ip"
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.networkDirectionDestinationIpLabel',
        { defaultMessage: 'Destination IP field' }
      )}
      dataTestSubj="streamsAppDestinationIpField"
    />
  );
};

export const NetworkDirectionTargetField = () => {
  return (
    <ProcessorFieldSelector
      fieldKey="target_field"
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.networkDirectionTargetFieldLabel',
        { defaultMessage: 'Target field' }
      )}
    />
  );
};
