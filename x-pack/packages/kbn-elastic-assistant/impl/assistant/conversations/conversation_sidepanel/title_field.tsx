/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { useController } from 'react-hook-form';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import deepEqual from 'fast-deep-equal';

interface TitleFieldProps {
  conversationIds?: string[];
  euiFieldProps?: Record<string, unknown>;
}

const TitleFieldComponent = ({ conversationIds, euiFieldProps }: TitleFieldProps) => {
  const {
    field: { onChange, value, name: fieldName },
    fieldState: { error },
  } = useController({
    name: 'title',
    defaultValue: '',
    rules: {
      required: {
        message: i18n.translate(
          'xpack.elasticAssistant.conversationSidepanel.titleField.titleIsRequired',
          {
            defaultMessage: 'Title is required',
          }
        ),
        value: true,
      },
      validate: () => {
        if (conversationIds?.includes(value)) {
          return i18n.translate(
            'xpack.elasticAssistant.conversationSidepanel.titleField.uniqueTitle',
            {
              defaultMessage: 'Title must be unique',
            }
          );
        }
      },
    },
  });

  const hasError = useMemo(() => !!error?.message, [error?.message]);

  return (
    <EuiFormRow
      label={i18n.translate('xpack.elasticAssistant.conversationSidepanel.titleFieldLabel', {
        defaultMessage: 'Title',
      })}
      error={error?.message}
      isInvalid={hasError}
      fullWidth
    >
      <EuiFieldText
        isInvalid={hasError}
        onChange={onChange}
        value={value}
        name={fieldName}
        fullWidth
        data-test-subj="input"
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};

export const TitleField = React.memo(TitleFieldComponent, deepEqual);
