/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiErrorBoundary, EuiPanel, EuiEmptyPrompt, EuiCode, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import styled from '@emotion/styled';

import { useStartServices } from '../hooks';

import { MissingESRequirementsPage } from '../applications/fleet/sections/agents/agent_requirements_page';

import { WithHeaderLayout, WithoutHeaderLayout } from '.';

import { Error } from '../applications/fleet/components';

import { DefaultLayout, DefaultPageTitle } from '../applications/fleet/layouts/default';

const Panel = styled(EuiPanel)`
  max-width: 500px;
  margin-right: auto;
  margin-left: auto;
`;

export const ErrorLayout: React.FunctionComponent<{
  children: React.ReactNode;
  isAddIntegrationsPath: boolean;
}> = ({ isAddIntegrationsPath, children }) => (
  <EuiErrorBoundary>
    {isAddIntegrationsPath ? (
      <WithHeaderLayout leftColumn={<DefaultPageTitle />}>{children}</WithHeaderLayout>
    ) : (
      <DefaultLayout>
        <WithoutHeaderLayout>{children}</WithoutHeaderLayout>
      </DefaultLayout>
    )}
  </EuiErrorBoundary>
);

export const PermissionsError: React.FunctionComponent<{
  error: string;
  requiredFleetRole?: string;
  callingApplication: string;
}> = React.memo(({ error, requiredFleetRole, callingApplication }) => {
  const { docLinks } = useStartServices();

  if (error === 'MISSING_SECURITY') {
    return <MissingESRequirementsPage missingRequirements={['security_required', 'api_keys']} />;
  }

  if (error === 'MISSING_PRIVILEGES') {
    return (
      <Panel data-test-subj="missingPrivilegesPrompt">
        <EuiEmptyPrompt
          iconType="securityApp"
          title={
            <h2 data-test-subj="missingPrivilegesPromptTitle">
              <FormattedMessage
                id="xpack.fleet.permissionDeniedErrorTitle"
                defaultMessage="Permission denied"
              />
            </h2>
          }
          body={
            <p data-test-subj="missingPrivilegesPromptMessage">
              {requiredFleetRole ? (
                <FormattedMessage
                  id="xpack.fleet.pagePermissionDeniedErrorMessage"
                  defaultMessage="You are not authorized to access that page. It requires the {roleName} Kibana privilege for Fleet."
                  values={{
                    roleName: <EuiCode>{requiredFleetRole}</EuiCode>,
                  }}
                />
              ) : (
                <FormattedMessage
                  id="xpack.fleet.permissionDeniedErrorMessage"
                  defaultMessage="You are not currently authorized to access {callingApplication}. For access, your Kibana role must include the {roleName2} or {roleName1} privilege for {callingApplication}. {guideLink}"
                  values={{
                    callingApplication,
                    roleName1: <EuiCode>&quot;All&quot;</EuiCode>,
                    roleName2: <EuiCode>&quot;Read&quot;</EuiCode>,
                    guideLink: (
                      <EuiLink
                        href={docLinks.links.fleet.roleAndPrivileges}
                        target="_blank"
                        external
                      >
                        <FormattedMessage
                          id="xpack.fleet.settings.rolesAndPrivilegesGuideLink"
                          defaultMessage="Learn more."
                        />
                      </EuiLink>
                    ),
                  }}
                />
              )}
            </p>
          }
        />
      </Panel>
    );
  }

  return (
    <Error
      title={
        <FormattedMessage
          id="xpack.fleet.permissionsRequestErrorMessageTitle"
          defaultMessage="Unable to check permissions"
        />
      }
      error={i18n.translate('xpack.fleet.permissionsRequestErrorMessageDescription', {
        defaultMessage: 'There was a problem checking Fleet permissions',
      })}
    />
  );
});
