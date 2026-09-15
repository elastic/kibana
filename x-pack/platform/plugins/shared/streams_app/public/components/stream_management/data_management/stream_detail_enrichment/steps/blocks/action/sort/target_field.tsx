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
import type { SortFormState } from '../../../../types';

export const SortTargetFieldSelector = () => {
  const {
    register,
    formState: { errors },
  } = useFormContext<SortFormState>();

  const { ref, ...inputProps } = register('to');

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.sortTargetFieldLabel',
        { defaultMessage: 'Target field' }
      )}
      helpText={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.sortTargetFieldHelpText',
        {
          defaultMessage:
            'Output field for the sorted array. Leave empty to update the source field.',
        }
      )}
      isInvalid={Boolean(errors.to)}
      error={errors.to?.message}
      fullWidth
    >
      <EuiFieldText isInvalid={Boolean(errors.to)} {...inputProps} inputRef={ref} />
    </EuiFormRow>
  );
};
