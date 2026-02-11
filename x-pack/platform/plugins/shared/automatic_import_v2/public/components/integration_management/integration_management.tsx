/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { EuiButton, EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import { ManagementContents } from './management_contents/management_contents';
import { ButtonsFooter } from '../../common/components/button_footer';
import { ConnectorSelector } from '../../common/components/connector_selector';
import { IntegrationFormProvider, useIntegrationForm } from './forms/integration_form';
import type { IntegrationFormData } from './forms/types';
import { PAGE_RESTRICT_WIDTH } from './constants';
import * as i18n from './translations';
import { useGetIntegrationById } from '../../common';

const IntegrationManagementContents: React.FC = () => {
  const { submit, isValid } = useIntegrationForm();

  const handleCancel = () => {
    // TODO: Link back to integrations later
    window.history.back();
  };

  return (
    <>
      <KibanaPageTemplate restrictWidth={PAGE_RESTRICT_WIDTH}>
        <KibanaPageTemplate.Header pageTitle={i18n.PAGE_TITLE_NEW_INTEGRATION} />
        <KibanaPageTemplate.Section>
          <ConnectorSelector />
          <ManagementContents />
        </KibanaPageTemplate.Section>
      </KibanaPageTemplate>
      <ButtonsFooter onAction={submit} isActionDisabled={!isValid} onCancel={handleCancel} />
    </>
  );
};

export const IntegrationManagement = React.memo(() => {
  const { integrationId } = useParams<{ integrationId?: string }>();
  const { integration, isLoading, isError } = useGetIntegrationById(integrationId);

  const initialFormData = useMemo(() => {
    if (!integration) return undefined;

    return {
      integrationId: integration.integrationId,
      title: integration.title,
      description: integration.description,
      logo: integration.logo,
    };
  }, [integration]);

  const handleSubmit = useCallback(async (data: IntegrationFormData) => {
    // eslint-disable-next-line no-console
    console.log('Form submitted with done button:', data);
  }, []);

  // Loading state when fetching existing integration
  if (integrationId && isLoading) {
    return <EuiEmptyPrompt icon={<EuiLoadingSpinner size="xl" />} />;
  }

  // Error state: ID provided but integration not found or fetch failed
  // TODO: Refactor into separate component
  if (integrationId && (isError || (!isLoading && !integration))) {
    return (
      <EuiEmptyPrompt
        iconType="warning"
        color="danger"
        title={<h2>{i18n.INTEGRATION_NOT_FOUND_TITLE}</h2>}
        body={<p>{i18n.INTEGRATION_NOT_FOUND_DESCRIPTION}</p>}
        actions={
          <EuiButton color="primary" fill onClick={() => window.history.back()}>
            {i18n.GO_BACK_BUTTON}
          </EuiButton>
        }
      />
    );
  }

  return (
    <IntegrationFormProvider
      key={integrationId ?? 'new-integration'}
      initialValue={initialFormData}
      onSubmit={handleSubmit}
    >
      <IntegrationManagementContents />
    </IntegrationFormProvider>
  );
});
IntegrationManagement.displayName = 'IntegrationManagement';
