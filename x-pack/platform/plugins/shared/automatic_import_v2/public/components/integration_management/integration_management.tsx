/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { ManagementContents } from './management_contents/management_contents';
import { ButtonsFooter } from '../../common/components/button_footer';
import { ConnectorSelector } from '../../common/components/connector_selector';
import { IntegrationFormProvider, useIntegrationForm } from './forms/integration_form';
import type { IntegrationFormData } from './forms/types';
import { PAGE_RESTRICT_WIDTH } from './constants';
import * as i18n from './translations';

const IntegrationManagementContents: React.FC = () => {
  const { submit, isValid } = useIntegrationForm();

  const handleCancel = () => {
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
  const handleSubmit = useCallback(async (data: IntegrationFormData) => {
    // eslint-disable-next-line no-console
    console.log('Form submitted:', data);
  }, []);

  return (
    <IntegrationFormProvider onSubmit={handleSubmit}>
      <IntegrationManagementContents />
    </IntegrationFormProvider>
  );
});
IntegrationManagement.displayName = 'IntegrationManagement';
