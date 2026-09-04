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
import type { ConvertFormState } from '../../../../types';

export const TargetFieldSelector = () => {
  const {
    register,
    formState: { errors },
  } = useFormContext<ConvertFormState>();

  const { ref, ...inputProps } = register('target_field', {
    validate: (value, formValues) => {
      const hasTargetField = Boolean(value?.trim());
      const isEqualToSourceField = value?.trim() === formValues.field?.trim();

      if (hasTargetField && isEqualToSourceField) {
        return i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.convertTargetFieldCannotBeEqualToSourceField',
          {
            defaultMessage: 'The target field cannot be the same as the source field.',
          }
        );
      }
      return true;
    },
  });

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.targetFieldLabel',
        { defaultMessage: 'Output field' }
      )}
      helpText={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.targetFieldHelpText',
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
