/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useState } from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { EuiSwitch, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { ManagementContents } from './management_contents/management_contents';
import { ButtonsFooter } from '../../common/components/button_footer';
import { ConnectorSelector } from '../../common/components/connector_selector';
import { IntegrationFormProvider, useIntegrationForm } from './forms/integration_form';
import { UIStateProvider } from './contexts';
import type { IntegrationFormData } from './forms/types';
import { PAGE_RESTRICT_WIDTH } from './constants';
import * as i18n from './translations';

interface IntegrationManagementContentsProps {
  integration: boolean;
  onToggleMock: (checked: boolean) => void;
}

const IntegrationManagementContents: React.FC<IntegrationManagementContentsProps> = ({
  integration,
  onToggleMock,
}) => {
  const { submit, isValid } = useIntegrationForm();

  const handleCancel = () => {
    window.history.back();
  };

  return (
    <>
      <KibanaPageTemplate restrictWidth={PAGE_RESTRICT_WIDTH}>
        <KibanaPageTemplate.Header pageTitle={i18n.PAGE_TITLE_NEW_INTEGRATION} />
        <KibanaPageTemplate.Section>
          {/* Dev toggle for mocking existing integration. Delete this later. */}
          <EuiCallOut title="Development Mode" color="warning" iconType="beaker" size="s">
            <EuiSwitch
              label="Mock existing integration (simulates loading from API)"
              checked={integration}
              onChange={(e) => onToggleMock(e.target.checked)}
              compressed
            />
          </EuiCallOut>
          <EuiSpacer size="m" />
          {/* end of delete this later */}

          <ConnectorSelector />
          <ManagementContents />
        </KibanaPageTemplate.Section>
      </KibanaPageTemplate>
      <ButtonsFooter onAction={submit} isActionDisabled={!isValid} onCancel={handleCancel} />
    </>
  );
};

// Mock data for an existing integration (for development/testing)
const MOCK_EXISTING_INTEGRATION: Partial<IntegrationFormData> = {
  integrationId: 'mock-integration-id-12345',
  title: 'My Existing Integration',
  description: 'This is a pre-existing integration loaded from the API.',
  logo: undefined,
};

export const IntegrationManagement = React.memo(() => {
  // We would receive the work in progress integration Saved Object from the API in production
  // TODO: Probably don't need cache here
  const [integration, setIntegration] = useState(false);

  const handleSubmit = useCallback(async (data: IntegrationFormData) => {
    // eslint-disable-next-line no-console
    console.log('Form submitted:', data);
  }, []);

  // Entry point for integration management.
  // If integrationId is provided, we're adding to an existing integration.
  // If not, we're creating a new integration. Remove this comment later
  return (
    <UIStateProvider>
      <IntegrationFormProvider
        // change key later to use the integrationId
        key={integration ? MOCK_EXISTING_INTEGRATION.integrationId : 'new-integration'}
        initialValue={integration ? MOCK_EXISTING_INTEGRATION : undefined}
        onSubmit={handleSubmit}
      >
        <IntegrationManagementContents integration={integration} onToggleMock={setIntegration} />
      </IntegrationFormProvider>
    </UIStateProvider>
  );
});
IntegrationManagement.displayName = 'IntegrationManagement';
