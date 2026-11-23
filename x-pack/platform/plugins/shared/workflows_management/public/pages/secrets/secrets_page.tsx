/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageTemplate, useEuiTheme } from '@elastic/eui';
import React, { useMemo } from 'react';
import { Redirect } from 'react-router-dom';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderBack } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { SecretsManagement } from '@kbn/secrets-ui';
import { PLUGIN_ID } from '../../../common';
import { useCanManageSecrets } from '../../entities/secrets/model/use_can_manage_secrets';
import { useSecretsApi } from '../../entities/secrets/model/use_secrets_api';
import { useKibana } from '../../hooks/use_kibana';
import { useWorkflowsBreadcrumbs } from '../../hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs';

const secretsPageTitle = i18n.translate('workflows.secretsPage.pageTitle', {
  defaultMessage: 'Secrets',
});

const getWorkflowSecretReference = (name: string): string => `{{ secrets.${name} }}`;

const SecretsPageContent = () => {
  const { euiTheme } = useEuiTheme();
  const { application, notifications } = useKibana().services;
  const api = useSecretsApi();

  useWorkflowsBreadcrumbs(secretsPageTitle);

  const back = useMemo<AppHeaderBack>(
    () => ({
      label: i18n.translate('workflows.secretsPage.backToWorkflows', {
        defaultMessage: 'Workflows',
      }),
      href: application.getUrlForApp(PLUGIN_ID),
    }),
    [application]
  );

  return (
    <EuiPageTemplate
      offset={0}
      css={{ backgroundColor: euiTheme.colors.backgroundBasePlain }}
      data-test-subj="workflowSecretsPage"
    >
      <AppHeader title={secretsPageTitle} back={back} spacing="compact" />
      <EuiPageTemplate.Section paddingSize="m" grow restrictWidth={false}>
        <SecretsManagement
          api={api}
          notifications={notifications}
          getSecretReference={getWorkflowSecretReference}
        />
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};

/** The page that manages the secrets of the space (`/app/workflows/secrets`). */
export const SecretsPage = () => {
  const canManageSecrets = useCanManageSecrets();

  // Without the privilege, or without the secrets plugin, there is nothing to manage here.
  if (!canManageSecrets) {
    return <Redirect to="/" />;
  }
  return <SecretsPageContent />;
};
