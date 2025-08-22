/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiFormRow, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { EsqlEditorField } from '../components/esql_editor_field';
import { ToolFormSection } from '../components/tool_form_section';
import type { EsqlToolFormData } from '../types/tool_form_types';
import { EsqlParams } from '../components/esql_params';

export const Configuration = () => {
  const {
    formState: { errors },
    control,
  } = useFormContext<EsqlToolFormData>();
  return (
    <ToolFormSection
      title="Configuration"
      icon="code"
      description="Set up how the tool works, including its logic and any needed parameters."
      content={<EuiCallOut title="Currently ES|QL only" iconType="info" size="s" />}
      documentation={{
        title: 'Configuring a tool',
        href: 'https://www.elastic.co/guide/en/enterprise-search/current/configuring-tools.html',
      }}
    >
      <EuiFormRow label="Type" error={errors.type?.message}>
        <Controller
          control={control}
          name="type"
          render={({ field: { ref, ...field } }) => (
            <EuiSelect
              disabled
              options={[{ text: 'ES|QL', value: 'esql' }]}
              {...field}
              inputRef={ref}
            />
          )}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('xpack.onechat.tools.newTool.esqlLabel', {
          defaultMessage: 'ES|QL Query',
        })}
        isInvalid={!!errors.esql}
      >
        <EsqlEditorField />
      </EuiFormRow>
      <EuiFormRow label="ES|QL Parameters" isInvalid={!!errors.params}>
        <EsqlParams />
      </EuiFormRow>
    </ToolFormSection>
  );
};
