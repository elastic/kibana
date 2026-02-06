/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow } from '@elastic/eui';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { EsqlEditorField } from '../../components/esql/esql_editor_field';
import { EsqlParams } from '../../components/esql/esql_params';
import { i18nMessages } from '../../i18n';
import type { EsqlToolFormData } from '../../types/tool_form_types';

export const EsqlConfiguration = () => {
  const {
    formState: { errors },
  } = useFormContext<EsqlToolFormData>();
  return (
    <>
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
    </>
  );
};
