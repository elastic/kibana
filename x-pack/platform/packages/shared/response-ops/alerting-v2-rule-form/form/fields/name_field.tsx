/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiInlineEditTitle, EuiFormRow, useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';
import { css } from '@emotion/react';
import { Controller, useFormContext } from 'react-hook-form';
import type { FormValues } from '../types';
import { DEFAULT_RULE_NAME } from '../constants';

export const NameField = () => {
  const { control } = useFormContext<FormValues>();
  const { euiTheme } = useEuiTheme();
  const editTitleId = useGeneratedHtmlId({ prefix: 'ruleNameInlineEdit' });

  const titleStyles = css`
    .euiInlineEditForm {
      .euiFieldText {
        font-size: ${euiTheme.size.l};
        font-weight: ${euiTheme.font.weight.bold};
        height: auto;
        padding: ${euiTheme.size.xs} ${euiTheme.size.s};
      }
    }
  `;

  return (
    <Controller
      name="metadata.name"
      control={control}
      rules={{
        validate: (value) => {
          if (!value || !value.trim()) {
            return i18n.translate('xpack.alertingV2.ruleForm.nameRequiredError', {
              defaultMessage: 'Name is required.',
            });
          }
          if (value.trim() === DEFAULT_RULE_NAME) {
            return i18n.translate('xpack.alertingV2.ruleForm.nameCannotBeDefaultError', {
              defaultMessage: 'Please provide a unique rule name.',
            });
          }
          return true;
        },
      }}
      render={({ field: { value, onChange }, fieldState: { error } }) => {
        const displayValue = value || DEFAULT_RULE_NAME;

        return (
          <EuiFormRow isInvalid={!!error} error={error?.message} fullWidth>
            <EuiInlineEditTitle
              heading="h2"
              inputAriaLabel={i18n.translate('xpack.alertingV2.ruleForm.nameAriaLabel', {
                defaultMessage: 'Edit rule name',
              })}
              value={displayValue}
              onChange={(e) => {
                const target = e.currentTarget as HTMLInputElement;
                onChange(target.value);
              }}
              onCancel={(previousValue) => {
                onChange(previousValue);
              }}
              css={titleStyles}
              size="m"
              isInvalid={!!error}
              data-test-subj="ruleNameInlineEdit"
              id={editTitleId}
              isReadOnly={false}
              editModeProps={{
                formRowProps: {
                  fullWidth: true,
                },
                inputProps: {
                  fullWidth: true,
                },
              }}
            />
          </EuiFormRow>
        );
      }}
    />
  );
};
