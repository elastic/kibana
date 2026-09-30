/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFormContext } from 'react-hook-form';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { RegisteredDomainFormState } from '../../../../types';

export const PrefixField = () => {
  const {
    register,
    formState: { errors },
  } = useFormContext<RegisteredDomainFormState>();

  const { ref, ...inputProps } = register('prefix', {
    required: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.registeredDomainPrefixFieldRequired',
      {
        defaultMessage: 'Prefix field is required.',
      }
    ),
  });

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.registeredDomainPrefixLabel',
        { defaultMessage: 'Prefix' }
      )}
      isInvalid={Boolean(errors.prefix)}
      error={errors.prefix?.message}
      fullWidth
    >
      <EuiFieldText
        placeholder={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.registeredDomainPrefixFieldPlaceholder',
          { defaultMessage: 'domain' }
        )}
        isInvalid={Boolean(errors.prefix)}
        {...inputProps}
        inputRef={ref}
      />
    </EuiFormRow>
  );
};
