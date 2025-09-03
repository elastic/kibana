/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiFormRow, EuiSelect } from '@elastic/eui';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { EsqlEditorField } from '../components/esql_editor_field';
import { EsqlParams } from '../components/esql_params';
import { ToolFormSection } from '../components/tool_form_section';
import { i18nMessages } from '../i18n';
import type { EsqlToolFormData } from '../types/tool_form_types';

export const Configuration = () => {
  const {
    formState: { errors },
    control,
  } = useFormContext<EsqlToolFormData>();
  return (
    <ToolFormSection
      title={i18nMessages.configuration.documentation.title}
      icon="code"
      description={i18nMessages.configuration.documentation.description}
      content={
        <EuiCallOut
          title={i18nMessages.configuration.documentation.esqlOnlyCallout}
          iconType="info"
          size="s"
        />
      }
      documentation={{
        title: i18nMessages.configuration.documentation.documentationLink,
        href: 'https://www.elastic.co/guide/en/enterprise-search/current/configuring-tools.html',
      }}
    >
      <EuiFormRow label={i18nMessages.configuration.form.type.label} error={errors.type?.message}>
        <Controller
          control={control}
          name="type"
          render={({ field: { ref, ...field } }) => (
            <EuiSelect
              disabled
              options={[{ text: i18nMessages.configuration.form.type.esqlOption, value: 'esql' }]}
              {...field}
              inputRef={ref}
            />
          )}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18nMessages.configuration.form.esql.queryLabel}
        isInvalid={!!errors.esql}
        error={errors.esql?.message}
      >
        <EsqlEditorField />
      </EuiFormRow>
      <EuiFormRow
        label={i18nMessages.configuration.form.esql.parametersLabel}
        isInvalid={!!errors.params}
      >
        <EsqlParams />
      </EuiFormRow>
    </ToolFormSection>
  );
};
