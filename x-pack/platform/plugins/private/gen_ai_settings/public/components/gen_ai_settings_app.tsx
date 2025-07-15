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
import { getConnectorsManagementHref } from '@kbn/observability-ai-assistant-plugin/public';
import { getSpaceIdFromPath } from '@kbn/spaces-utils';
import { useEnabledFeatures } from '../contexts/serverless_context';

interface GenAiSettingsAppProps {
  setBreadcrumbs: ManagementAppMountParams['setBreadcrumbs'];
  coreStart: CoreStart;
}

const GoToSpacesButton = ({ getUrlForSpaces }: { getUrlForSpaces: () => string }) => {
  return (
    <EuiButton
      iconType="popout"
      iconSide="right"
      data-test-subj="genAiSettingsGoToSpacesButton"
      href={getUrlForSpaces()}
      target="_blank"
      rel="noopener noreferrer"
    >
      {i18n.translate('genAiSettings.goToSpacesButtonLabel', {
        defaultMessage: 'Go to spaces',
      })}
    </EuiButton>
  );
};

export const GenAiSettingsApp: React.FC<GenAiSettingsAppProps> = ({
  setBreadcrumbs,
  coreStart,
}) => {
  const { application, http, docLinks } = coreStart;
  const { showSpacesIntegration } = useEnabledFeatures();

  useEffect(() => {
    setBreadcrumbs([
      {
        text: i18n.translate('genAiSettings.breadcrumbs.genAiSettings', {
          defaultMessage: 'GenAI Settings',
        }),
      },
    ]);
  }, [setBreadcrumbs]);

  const getUrlForSpaces = () => {
    const basePath = http.basePath.get();
    const { spaceId } = getSpaceIdFromPath(basePath, http.basePath.serverBasePath);

    return application.getUrlForApp('management', {
      path: `/kibana/spaces/edit/${spaceId}`,
    });
  };

  return (
    <div data-test-subj="genAiSettingsPage">
      <EuiTitle size="l">
        <h2>
          {i18n.translate('xpack.genAiSettings.pageTitle', {
            defaultMessage: 'GenAI Settings',
          })}
        </h2>
      </EuiTitle>

      <EuiPageSection>
        <EuiPanel hasBorder grow={false}>
          <EuiDescribedFormGroup
            fullWidth
            title={
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="sparkles" size="m" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiTitle size="xs">
                    <h3>
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
                    data-test-subj="genAiSettingsGoToConnectorsButton"
                    href={getConnectorsManagementHref(http!)}
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
              title={
                <h3>
                  {i18n.translate('genAiSettings.aiFeatureVisibilityLabel', {
                    defaultMessage: 'AI feature visibility',
                  })}
                </h3>
              }
              description={
                <p>
                  <FormattedMessage
                    id="genAiSettings.showAIAssistantDescriptionLabel"
                    defaultMessage="Enable or disable AI-powered features in the {spaces} settings."
                    values={{
                      spaces: <strong>Spaces</strong>,
                    }}
                  />
                </p>
              }
            >
              <EuiFormRow fullWidth>
                <GoToSpacesButton getUrlForSpaces={getUrlForSpaces} />
              </EuiFormRow>
            </EuiDescribedFormGroup>
          )}
        </EuiPanel>
      </EuiPageSection>
    </div>
  );
};
