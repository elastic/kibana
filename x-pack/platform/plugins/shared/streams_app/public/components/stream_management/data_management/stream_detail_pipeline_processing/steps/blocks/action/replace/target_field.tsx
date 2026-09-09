/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ReplaceFormState } from '../../../../types';

export const ReplaceTargetFieldSelector = () => {
  const {
    register,
    formState: { errors },
  } = useFormContext<ReplaceFormState>();

  const { ref, ...inputProps } = register('target_field');

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.replaceTargetFieldLabel',
        { defaultMessage: 'Output field' }
      )}
      helpText={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.replaceTargetFieldHelpText',
        { defaultMessage: 'If empty, the input field is updated in place.' }
      )}
      isInvalid={Boolean(errors.target_field)}
      error={errors.target_field?.message}
      fullWidth
    >
      <EuiFieldText isInvalid={Boolean(errors.target_field)} {...inputProps} inputRef={ref} />
    </EuiFormRow>
  );
};
