/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiForm, EuiSteps } from '@elastic/eui';
import { css } from '@emotion/react';
import { DetailsSection } from './sections/details_section';
import { RedirectUriSection } from './sections/redirect_uri_section';
import { CredentialsSection } from './sections/credentials_section';
import { labels } from '../../../utils/i18n';

export interface McpClientFormProps {
  onSubmit: () => void;
}

const formStyles = css`
  .euiFormControlLayout,
  .euiComboBox,
  .euiPopover,
  .euiFilePicker {
    max-inline-size: 520px;
  }
`;
export const McpClientForm = ({ onSubmit }: McpClientFormProps) => {
  return (
    <EuiForm component="form" onSubmit={onSubmit} css={formStyles} fullWidth>
      <EuiSteps
        headingElement="h3"
        steps={[
          {
            title: labels.tools.mcpClients.form.detailsSectionTitle,
            children: <DetailsSection />,
          },
          {
            title: labels.tools.mcpClients.form.redirectSectionTitle,
            children: <RedirectUriSection />,
          },
        ]}
      />
      <CredentialsSection />
    </EuiForm>
  );
};
