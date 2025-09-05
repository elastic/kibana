/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiFormRow, EuiSelect } from '@elastic/eui';
import { ToolType } from '@kbn/onechat-common/tools/definition';
import React from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { ToolFormSection } from '../components/tool_form_section';
import { i18nMessages } from '../i18n';
import type { ToolFormData } from '../types/tool_form_types';
import { EsqlConfiguration } from './configuration_fields/esql_configuration_fields';

export const Configuration = () => {
  const {
    formState: { errors },
    control,
  } = useFormContext<ToolFormData>();
  const type = useWatch({ control, name: 'type' });

  let configurationFields: React.ReactNode;
  switch (type) {
    case ToolType.esql:
      configurationFields = <EsqlConfiguration />;
      break;
    default:
      configurationFields = null;
      break;
  }

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
        href: '#', // TODO: add documentation link when available
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
      {configurationFields}
    </ToolFormSection>
  );
};
