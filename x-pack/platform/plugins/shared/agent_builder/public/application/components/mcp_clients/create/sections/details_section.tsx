/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldText, EuiFormRow, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import type { McpClientFormData } from '../types';
import { labels } from '../../../../utils/i18n';
import { McpLogoPicker } from '../mcp_logo_picker';

export const DetailsSection = () => {
  const {
    control,
    formState: { errors },
  } = useFormContext<McpClientFormData>();

  const logoError = errors.clientLogo?.message;

  return (
    <>
      <EuiFormRow
        label={labels.tools.mcpClients.form.nameLabel}
        isInvalid={!!errors.clientName}
        error={errors.clientName?.message}
        data-test-subj="mcpClientNameRow"
      >
        <Controller
          control={control}
          name="clientName"
          render={({ field: { ref, ...field }, fieldState: { invalid } }) => (
            <EuiFieldText
              placeholder={labels.tools.mcpClients.form.namePlaceholder}
              inputRef={ref}
              isInvalid={invalid}
              data-test-subj="mcpClientNameInput"
              {...field}
            />
          )}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={labels.tools.mcpClients.form.logoLabel}
        isInvalid={logoError !== undefined}
        error={logoError}
        data-test-subj="mcpClientLogoRow"
      >
        <McpLogoPicker />
      </EuiFormRow>
    </>
  );
};
