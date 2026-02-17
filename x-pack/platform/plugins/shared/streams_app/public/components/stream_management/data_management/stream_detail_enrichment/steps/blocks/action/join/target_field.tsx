/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import { useFormContext } from 'react-hook-form';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import React from 'react';
import type { JoinFormState } from '../../../../types';

export const JoinTargetFieldSelector = () => {
  const {
    register,
    formState: { errors },
  } = useFormContext<JoinFormState>();

  const { ref, ...inputProps } = register('to', {
    required: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.joinTargetFieldRequired',
      { defaultMessage: 'Output field is required.' }
    ),
  });

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.joinTargetFieldLabel',
        { defaultMessage: 'Output field name' }
      )}
      isInvalid={Boolean(errors.to)}
      error={errors.to?.message}
      fullWidth
    >
      <EuiFieldText
        placeholder={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.joinTargetFieldPlaceholder',
          { defaultMessage: 'Enter a name for the resulting field' }
        )}
        isInvalid={Boolean(errors.to)}
        {...inputProps}
        inputRef={ref}
      />
    </EuiFormRow>
  );
};
