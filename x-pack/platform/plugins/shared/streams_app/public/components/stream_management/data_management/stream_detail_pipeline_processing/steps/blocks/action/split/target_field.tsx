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
import type { SplitFormState } from '../../../../types';

export const SplitTargetFieldSelector = () => {
  const {
    register,
    formState: { errors },
  } = useFormContext<SplitFormState>();

  const { ref, ...inputProps } = register('target_field', {
    validate: (value, formValues) => {
      const isEqualToSourceField = value?.trim() === formValues.field?.trim();

      // Check for Mustache template syntax
      if (value?.includes('{{')) {
        return i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.targetFieldMustacheError',
          {
            defaultMessage:
              "Mustache template syntax '{{' '}}' or '{{{' '}}}' is not allowed in field names",
          }
        );
      }

      if (value && isEqualToSourceField) {
        return i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.splitTargetFieldCannotBeEqualToSourceField',
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
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.splitTargetFieldLabel',
        { defaultMessage: 'Target field' }
      )}
      helpText={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.splitTargetFieldHelpText',
        {
          defaultMessage:
            'Output field for the resulting array. Leave empty to update the source field.',
        }
      )}
      isInvalid={Boolean(errors.target_field)}
      error={errors.target_field?.message}
      fullWidth
    >
      <EuiFieldText isInvalid={Boolean(errors.target_field)} {...inputProps} inputRef={ref} />
    </EuiFormRow>
  );
};
