/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiForm, EuiHorizontalRule } from '@elastic/eui';
import { css } from '@emotion/react';
import { useFormContext } from 'react-hook-form';
import { OrganizationSection } from './sections/organization';
import { SourceSection } from './sections/source';
import type { BulkImportMcpToolsFormData } from './types';

const formStyles = ({ euiTheme }: UseEuiTheme) => css`
  .euiFormHelpText {
    color: ${euiTheme.colors.textSubdued};
  }
`;

export interface BulkImportMcpToolsFormProps {
  formId: string;
  onSubmit: (data: BulkImportMcpToolsFormData) => void;
}

export const BulkImportMcpToolsForm: React.FC<BulkImportMcpToolsFormProps> = ({
  formId,
  onSubmit,
}) => {
  const { handleSubmit } = useFormContext<BulkImportMcpToolsFormData>();

  return (
    <EuiForm
      id={formId}
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      fullWidth
      css={formStyles}
    >
      <SourceSection />
      <EuiHorizontalRule margin="xl" />
      <OrganizationSection />
    </EuiForm>
  );
};
