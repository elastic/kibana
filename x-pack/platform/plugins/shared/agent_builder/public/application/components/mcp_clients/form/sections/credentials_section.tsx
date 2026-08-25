/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonGroup, EuiCheckbox, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import type { McpClientFormData } from '../types';
import { labels } from '../../../../utils/i18n';

const RESOURCE_OPTIONS = [
  { id: 'mcp', label: 'MCP Server' },
  { id: 'a2a', label: 'A2A Agent' },
];

export const CredentialsSection = () => {
  const { control } = useFormContext<McpClientFormData>();

  return (
    <EuiPanel hasShadow={false} color="highlighted">
      <EuiTitle size="xs">
        <h4>{labels.tools.mcpClients.form.credentialsSectionTitle}</h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        {labels.tools.mcpClients.form.credentialsSectionDescription}
      </EuiText>
      <EuiSpacer size="m" />
      <Controller
        control={control}
        name="isConfidential"
        render={({ field }) => (
          <EuiCheckbox
            id="mcpClientConfidential"
            label={
              <>
                <strong>{labels.tools.mcpClients.form.confidentialLabel}</strong>
                <EuiText size="s" color="subdued">
                  {labels.tools.mcpClients.form.confidentialDescription}
                </EuiText>
              </>
            }
            checked={field.value}
            onChange={(e) => field.onChange(e.target.checked)}
            data-test-subj="mcpClientConfidentialCheckbox"
          />
        )}
      />
      <EuiSpacer size="m" />
      <Controller
        control={control}
        name="resource"
        render={({ field }) => (
          <EuiButtonGroup
            legend="Endpoint type"
            options={RESOURCE_OPTIONS}
            idSelected={field.value}
            onChange={(id) => field.onChange(id)}
            type="single"
            data-test-subj="mcpClientResourceButtonGroup"
          />
        )}
      />
    </EuiPanel>
  );
};
