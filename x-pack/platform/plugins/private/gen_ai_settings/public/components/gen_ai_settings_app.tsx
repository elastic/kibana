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
import {
  getConnectorsManagementHref,
  getElasticManagedLlmConnector,
} from '@kbn/observability-ai-assistant-plugin/public';
import { useGenAIConnectors } from '@kbn/ai-assistant/src/hooks';

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
  const connectors = useGenAIConnectors();
  const elasticManagedLlm = getElasticManagedLlmConnector(connectors.connectors);

  useEffect(() => {
    setBreadcrumbs([
      {
        text: i18n.translate('genAiSettings.breadcrumbs.management', {
          defaultMessage: 'Stack Management',
        }),
        href: '/app/management',
      },
      {
        text: i18n.translate('genAiSettings.breadcrumbs.ai', {
          defaultMessage: 'AI',
        }),
      },
      {
        text: i18n.translate('genAiSettings.breadcrumbs.genAiSettings', {
          defaultMessage: 'GenAI Settings',
        }),
      },
    ]);
  }, [setBreadcrumbs]);

  const getUrlForSpaces = () => {
    return application.getUrlForApp('management', {
      path: '/kibana/spaces',
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
              !!elasticManagedLlm ? (
                <p>
                  <FormattedMessage
                    id="genAiSettings.aiConnectorDescriptionWithLink"
                    defaultMessage={`Elastic AI Assistant and other AI features are powered by an LLM. The Elastic Managed LLM connector is used by default ({link}) when no custom connectors are available. Select "Manage connectors" to configure and use a custom connector.`}
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
                    }}
                  />
                </p>
              ) : (
                <p>
                  {i18n.translate('genAiSettings.aiConnectorDescription', {
                    defaultMessage:
                      'A large language model (LLM) is required to power the AI Assistant and AI-driven features in Elastic. In order to use the AI Assistant you must set up a Generative AI connector.',
                  })}
                </p>
              )
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

          <EuiSpacer size="l" />

          <EuiDescribedFormGroup
            fullWidth
            title={
              <h3>
                {i18n.translate('genAiSettings.showAIAssistantButtonLabel', {
                  defaultMessage:
                    'Show AI Assistant button and Contextual Insights in Observability apps',
                })}
              </h3>
            }
            description={
              <p>
                {i18n.translate('genAiSettings.showAIAssistantDescriptionLabel', {
                  defaultMessage:
                    'Toggle the AI Assistant button and Contextual Insights on or off in Observability apps by checking or unchecking the AI Assistant feature in Spaces > <your space> > Features.',
                  ignoreTag: true,
                })}
              </p>
            }
          >
            <EuiFormRow fullWidth>
              <GoToSpacesButton getUrlForSpaces={getUrlForSpaces} />
            </EuiFormRow>
          </EuiDescribedFormGroup>
        </EuiPanel>
      </EuiPageSection>
    </div>
  );
};
