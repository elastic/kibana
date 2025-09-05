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
import type { ToolFormData } from './types/tool_form_types';

export enum ToolFormMode {
  Create = 'create',
  Edit = 'edit',
  View = 'view',
}

interface BaseToolFormProps {
  formId: string;
}

interface EditableToolFormProps extends BaseToolFormProps {
  mode: ToolFormMode.Create | ToolFormMode.Edit;
  saveTool: (data: ToolFormData) => void;
}

interface ReadonlyToolFormProps extends BaseToolFormProps {
  mode: ToolFormMode.View;
  saveTool?: never;
}

export type ToolFormProps = EditableToolFormProps | ReadonlyToolFormProps;

export const ToolForm = ({ mode, formId, saveTool }: ToolFormProps) => {
  const { euiTheme } = useEuiTheme();
  const { handleSubmit } = useFormContext<ToolFormData>();
  const isViewMode = mode === ToolFormMode.View;

  return (
    <EuiForm
      component="form"
      id={formId}
      onSubmit={!isViewMode ? handleSubmit(saveTool) : undefined}
      fullWidth
      css={css`
        .euiFormHelpText {
          color: ${euiTheme.colors.textSubdued};
        }
      `}
    >
      <SystemReferences mode={mode} />
      <EuiHorizontalRule />
      <Labels mode={mode} />
      {!isViewMode && (
        <>
          <EuiHorizontalRule />
          <Configuration />
        </>
      )}
      <EuiHorizontalRule />
    </EuiForm>
  );
};
