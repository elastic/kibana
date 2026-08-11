/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiFieldNumber, EuiTextArea, EuiSpacer } from '@elastic/eui';
import { useFormContext, Controller } from 'react-hook-form';
import { IndexSearchPattern } from '../../components/index_search/index_search_pattern';
import type { IndexSearchToolFormData } from '../../types/tool_form_types';
import { i18nMessages } from '../../i18n';

export const IndexSearchConfiguration = () => {
  const {
    control,
    formState: { errors },
  } = useFormContext<IndexSearchToolFormData>();
  return (
    <>
      <EuiFormRow
        label={i18nMessages.configuration.form.indexSearch.patternLabel}
        isInvalid={!!errors.pattern}
        error={errors.pattern?.message}
      >
        <IndexSearchPattern />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiFormRow
        label={i18nMessages.configuration.form.indexSearch.defaultRowLimitLabel}
        helpText={i18nMessages.configuration.form.indexSearch.defaultRowLimitHelpText}
        isInvalid={!!errors.rowLimit}
        error={errors.rowLimit?.message}
      >
        <Controller
          name="rowLimit"
          control={control}
          render={({ field }) => (
            <EuiFieldNumber
              {...field}
              onChange={(e) =>
                field.onChange(isNaN(e.target.valueAsNumber) ? undefined : e.target.valueAsNumber)
              }
              min={1}
              step={1}
              compressed
            />
          )}
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiFormRow
        label={i18nMessages.configuration.form.indexSearch.customInstructionsLabel}
        helpText={i18nMessages.configuration.form.indexSearch.customInstructionsHelpText}
        isInvalid={!!errors.customInstructions}
        error={errors.customInstructions?.message}
        fullWidth
      >
        <Controller
          name="customInstructions"
          control={control}
          render={({ field }) => (
            <EuiTextArea
              {...field}
              value={field.value ?? ''}
              placeholder={
                i18nMessages.configuration.form.indexSearch.customInstructionsPlaceholder
              }
              rows={3}
              compressed
              fullWidth
            />
          )}
        />
      </EuiFormRow>
    </>
  );
};
