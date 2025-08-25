/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiForm, EuiHorizontalRule, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Configuration } from './sections/configuration';
import { Labels } from './sections/labels';
import { SystemReferences } from './sections/system_references';
import type { EsqlToolFormData } from './types/tool_form_types';

export enum ToolFormMode {
  Create = 'create',
  Edit = 'edit',
}

export interface ToolFormProps {
  mode: ToolFormMode;
  formId: string;
  saveTool: (data: EsqlToolFormData) => void;
}

export const ToolForm = ({ mode, formId, saveTool }: ToolFormProps) => {
  const { euiTheme } = useEuiTheme();
  const { handleSubmit } = useFormContext<EsqlToolFormData>();

  return (
    <EuiForm
      component="form"
      id={formId}
      onSubmit={handleSubmit(saveTool)}
      fullWidth
      css={css`
        .euiFormHelpText {
          color: ${euiTheme.colors.textSubdued};
        }
      `}
    >
      <SystemReferences mode={mode} />
      <EuiHorizontalRule />
      <Labels />
      <EuiHorizontalRule />
      <Configuration />
      <EuiHorizontalRule />
    </EuiForm>
  );
};
