/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  EuiPageSection,
  EuiSpacer,
  EuiPanel,
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTitle,
  EuiLink,
  EuiButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CoreStart } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';

import { getSpaceIdFromPath } from '@kbn/spaces-utils';
import { useEnabledFeatures } from '../contexts/enabled_features_context';
import { GoToSpacesButton } from './go_to_spaces_button';
import { getConnectorsManagementHref } from '../utils/connectors';

interface GenAiSettingsAppProps {
  setBreadcrumbs: ManagementAppMountParams['setBreadcrumbs'];
  coreStart: CoreStart;
}

export const GenAiSettingsApp: React.FC<GenAiSettingsAppProps> = ({
  setBreadcrumbs,
  coreStart,
}) => {
  const { application, http, docLinks } = coreStart;
  const { showSpacesIntegration, isPermissionsBased, showAiBreadcrumb } = useEnabledFeatures();

  useEffect(() => {
    const breadcrumbs = [
      ...(showAiBreadcrumb
        ? [
            {
              text: i18n.translate('genAiSettings.breadcrumbs.ai', {
                defaultMessage: 'AI',
              }),
            },
          ]
        : []),
      {
        text: i18n.translate('genAiSettings.breadcrumbs.genAiSettings', {
          defaultMessage: 'GenAI Settings',
        }),
      },
    ];

    setBreadcrumbs(breadcrumbs);
  }, [setBreadcrumbs, showAiBreadcrumb]);

  const getUrlForSpaces = (toPermissionsTab: boolean = false) => {
    const basePath = http.basePath.get();
    const { spaceId } = getSpaceIdFromPath(basePath, http.basePath.serverBasePath);

    const path = `/kibana/spaces/edit/${spaceId}${toPermissionsTab ? '/roles' : ''}`;

    return application.getUrlForApp('management', {
      path,
    });
  };

  return (
    <div data-test-subj="genAiSettingsPage">
      <EuiTitle size="l">
        <h2 data-test-subj="genAiSettingsTitle">
          {i18n.translate('xpack.genAiSettings.pageTitle', {
            defaultMessage: 'GenAI Settings',
          })}
        </h2>
      </EuiTitle>

      <EuiPageSection>
        <EuiPanel hasBorder grow={false}>
          <EuiDescribedFormGroup
            data-test-subj="connectorsSection"
            fullWidth
            title={
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="sparkles" size="m" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiTitle size="xs">
                    <h3 data-test-subj="connectorsTitle">
                      {i18n.translate('genAiSettings.aiConnectorLabel', {
                        defaultMessage: 'AI Connector',
                      })}
                    </h3>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            description={
              <p>
                <FormattedMessage
                  id="genAiSettings.aiConnectorDescriptionWithLink"
                  defaultMessage={`A large language model (LLM) is required to power the AI Assistant and AI-powered features. By default, Elastic uses its {elasticManagedLlm} connector ({link}) when no custom connectors are available. When available, Elastic uses the last used custom connector.${
                    showSpacesIntegration
                      ? ' Set up your own connectors or disable the AI Assistant from the {aiFeatureVisibility} setting below.'
                      : ''
                  }`}
                  values={{
                    link: (
                      <EuiLink
                        href={docLinks?.links?.observability?.elasticManagedLlmUsageCost}
                        target="_blank"
                      >
                        {i18n.translate('genAiSettings.additionalCostsLink', {
                          defaultMessage: 'additional costs incur',
                        })}
                      </EuiLink>
                    ),
                    elasticManagedLlm: <strong>Elastic Managed LLM</strong>,
                    ...(showSpacesIntegration && {
                      aiFeatureVisibility: <strong>AI feature visibility</strong>,
                    }),
                  }}
                />
              </p>
            }
          >
            <EuiFormRow fullWidth>
              <EuiFlexGroup gutterSize="m" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    iconType="popout"
                    iconSide="right"
                    data-test-subj="manageConnectorsLink"
                    href={getConnectorsManagementHref(http)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {i18n.translate('genAiSettings.goToConnectorsButtonLabel', {
                      defaultMessage: 'Manage connectors',
                    })}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFormRow>
          </EuiDescribedFormGroup>

          {showSpacesIntegration && <EuiSpacer size="l" />}

          {showSpacesIntegration && (
            <EuiDescribedFormGroup
              fullWidth
              data-test-subj="aiFeatureVisibilitySection"
              title={
                <h3 data-test-subj="aiFeatureVisibilityTitle">
                  {i18n.translate('genAiSettings.aiFeatureVisibilityLabel', {
                    defaultMessage: 'AI feature visibility',
                  })}
                </h3>
              }
              description={
                <p>
                  {isPermissionsBased ? (
                    <FormattedMessage
                      id="genAiSettings.solutionViewDescriptionLabel"
                      defaultMessage="Turn AI-powered features on or off (for custom roles only) on the {permissionsTab} in the {spaces} settings. Create custom roles at {rolesLink}."
                      values={{
                        permissionsTab: <strong>Permissions tab</strong>,
                        spaces: <strong>Spaces</strong>,
                        rolesLink: (
                          <EuiLink
                            href={application.getUrlForApp('management', {
                              path: '/security/roles',
                            })}
                          >
                            {i18n.translate('genAiSettings.rolesLink', {
                              defaultMessage: 'Stack Management > Roles',
                            })}
                          </EuiLink>
                        ),
                      }}
                    />
                  ) : (
                    <FormattedMessage
                      id="genAiSettings.showAIAssistantDescriptionLabel"
                      defaultMessage="Enable or disable AI-powered features in the {spaces} settings."
                      values={{
                        spaces: <strong>Spaces</strong>,
                      }}
                    />
                  )}
                </p>
              }
            >
              <EuiFormRow fullWidth>
                <GoToSpacesButton
                  getUrlForSpaces={getUrlForSpaces}
                  navigateToPermissions={isPermissionsBased}
                />
              </EuiFormRow>
            </EuiDescribedFormGroup>
          )}
        </EuiPanel>
      </EuiPageSection>
    </div>
  );
};
