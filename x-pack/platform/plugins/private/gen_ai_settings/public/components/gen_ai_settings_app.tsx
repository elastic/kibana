/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useCallback, useMemo } from 'react';
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
  useEuiTheme,
  EuiButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';

import { getSpaceIdFromPath } from '@kbn/spaces-utils';
import { isEmpty } from 'lodash';
import { AI_ASSISTANT_DEFAULT_LLM_SETTING_ENABLED } from '../../common/constants';
import { useEnabledFeatures } from '../contexts/enabled_features_context';
import { useKibana } from '../hooks/use_kibana';
import { GoToSpacesButton } from './go_to_spaces_button';
import { useGenAiConnectors } from '../hooks/use_genai_connectors';
import { getElasticManagedLlmConnector } from '../utils/get_elastic_managed_llm_connector';
import { useSettingsContext } from '../contexts/settings_context';
import { DefaultAIConnector } from './default_ai_connector/default_ai_connector';
import { BottomBarActions } from './bottom_bar_actions/bottom_bar_actions';
import { AIAssistantVisibility } from './ai_assistant_visibility/ai_assistant_visibility';

interface GenAiSettingsAppProps {
  setBreadcrumbs: ManagementAppMountParams['setBreadcrumbs'];
}

export const GenAiSettingsApp: React.FC<GenAiSettingsAppProps> = ({ setBreadcrumbs }) => {
  const { services } = useKibana();
  const { application, http, docLinks, notifications, featureFlags } = services;
  const {
    showSpacesIntegration,
    isPermissionsBased,
    showAiBreadcrumb,
    showAiAssistantsVisibilitySetting,
  } = useEnabledFeatures();
  const { euiTheme } = useEuiTheme();
  const { unsavedChanges, isSaving, cleanUnsavedChanges, saveAll } = useSettingsContext();

  const hasConnectorsAllPrivilege =
    application.capabilities.actions?.show === true &&
    application.capabilities.actions?.execute === true &&
    application.capabilities.actions?.delete === true &&
    application.capabilities.actions?.save === true;
  const canManageSpaces = application.capabilities.management.kibana.spaces;
  const connectors = useGenAiConnectors();
  const hasElasticManagedLlm = getElasticManagedLlmConnector(connectors.connectors);

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

  const handleNavigateToSpaces = useCallback(() => {
    const basePath = http.basePath.get();
    const { spaceId } = getSpaceIdFromPath(basePath, http.basePath.serverBasePath);
    const spacesPath = `/kibana/spaces/edit/${spaceId}${isPermissionsBased ? '/roles' : ''}`;

    application.navigateToApp('management', {
      path: spacesPath,
      openInNewTab: true,
    });
  }, [application, http.basePath, isPermissionsBased]);

  const showDefaultLlmSetting = featureFlags.getBooleanValue(
    AI_ASSISTANT_DEFAULT_LLM_SETTING_ENABLED,
    false
  );

  const connectorDescription = useMemo(() => {
    if (!hasElasticManagedLlm) {
      return (
        <p>
          <FormattedMessage
            id="genAiSettings.aiConnectorDescription"
            defaultMessage={`A large language model (LLM) is required to power the AI Assistant and AI-driven features in Elastic. In order to use the AI Assistant you must ${
              hasConnectorsAllPrivilege ? 'set up' : 'have'
            } a Generative AI connector. {manageConnectors}`}
            values={{
              manageConnectors: showDefaultLlmSetting ? (
                <EuiLink
                  href={application.getUrlForApp('management', {
                    path: 'insightsAndAlerting/triggersActionsConnectors/connectors',
                  })}
                  target="_blank"
                >
                  <FormattedMessage
                    id="genAiSettings.manage.connectors"
                    defaultMessage={
                      hasConnectorsAllPrivilege ? 'Manage connectors' : 'View connectors'
                    }
                  />
                </EuiLink>
              ) : null,
            }}
          />
        </p>
      );
    }

    const showSpacesNote = showSpacesIntegration && canManageSpaces && hasConnectorsAllPrivilege;

    return (
      <p>
        <FormattedMessage
          id="genAiSettings.aiConnectorDescriptionWithLink"
          defaultMessage={`A large language model (LLM) is required to power the AI Assistant and AI-powered features. By default, Elastic uses its {elasticManagedLlm} connector ({link}) when no custom connectors are available. When available, Elastic uses the last used custom connector.${
            showSpacesNote
              ? ' Set up your own connectors or disable the AI Assistant from the {aiFeatureVisibility} setting below.'
              : ''
          } {manageConnectors}`}
          values={{
            link: (
              <EuiLink
                href={docLinks?.links?.observability?.elasticManagedLlmUsageCost}
                target="_blank"
              >
                <FormattedMessage
                  id="genAiSettings.additionalCostsLink"
                  defaultMessage="additional costs incur"
                />
              </EuiLink>
            ),
            manageConnectors: showDefaultLlmSetting ? (
              <EuiLink
                href={application.getUrlForApp('management', {
                  path: 'insightsAndAlerting/triggersActionsConnectors/connectors',
                })}
                target="_blank"
              >
                <FormattedMessage
                  id="genAiSettings.manage.connectors"
                  defaultMessage="Manage connectors"
                />
              </EuiLink>
            ) : null,
            elasticManagedLlm: (
              <strong>
                <FormattedMessage
                  id="genAiSettings.elasticManagedLlm"
                  defaultMessage="Elastic Managed LLM"
                />
              </strong>
            ),
            ...(showSpacesNote && {
              aiFeatureVisibility: (
                <strong>
                  <FormattedMessage
                    id="genAiSettings.aiFeatureVisibilityText"
                    defaultMessage="AI feature visibility"
                  />
                </strong>
              ),
            }),
          }}
        />
      </p>
    );
  }, [
    hasElasticManagedLlm,
    hasConnectorsAllPrivilege,
    showSpacesIntegration,
    canManageSpaces,
    docLinks,
    application,
    showDefaultLlmSetting,
  ]);

  async function handleSave() {
    try {
      const needsReload = await saveAll();
      if (needsReload) {
        window.location.reload();
      }
    } catch (e) {
      const error = e as Error;
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.observabilityAiAssistantManagement.save.error', {
          defaultMessage: 'An error occurred while saving the settings',
        }),
        text: error.message,
      });
      throw error;
    }
  }

  const manageConnectorsButton = useMemo(() => {
    return (
      <EuiButton
        iconType="popout"
        iconSide="right"
        data-test-subj="manageConnectorsLink"
        onClick={() => {
          application.navigateToApp('management', {
            path: 'insightsAndAlerting/triggersActionsConnectors/connectors',
            openInNewTab: true,
          });
        }}
      >
        {hasConnectorsAllPrivilege ? (
          <FormattedMessage
            id="genAiSettings.goToConnectorsButtonLabel"
            defaultMessage="Manage connectors"
          />
        ) : (
          <FormattedMessage
            id="genAiSettings.viewConnectorsButtonLabel"
            defaultMessage="View connectors"
          />
        )}
      </EuiButton>
    );
  }, [application, hasConnectorsAllPrivilege]);

  return (
    <>
      <div data-test-subj="genAiSettingsPage">
        <EuiTitle size="l">
          <h2 data-test-subj="genAiSettingsTitle">
            <FormattedMessage id="xpack.genAiSettings.pageTitle" defaultMessage="GenAI Settings" />
          </h2>
        </EuiTitle>

        <EuiPageSection
          paddingSize="none"
          css={{
            paddingTop: euiTheme.size.l,
          }}
        >
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
                        <FormattedMessage
                          id="genAiSettings.aiConnectorLabel"
                          defaultMessage="Default AI Connector"
                        />
                      </h3>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
              description={connectorDescription}
            >
              <EuiFormRow fullWidth>
                <EuiFlexGroup gutterSize="m" responsive={false}>
                  <EuiFlexItem grow={false}>
                    {showDefaultLlmSetting ? (
                      <DefaultAIConnector connectors={connectors} />
                    ) : (
                      manageConnectorsButton
                    )}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFormRow>
            </EuiDescribedFormGroup>

            {showSpacesIntegration && canManageSpaces && <EuiSpacer size="l" />}

            {showSpacesIntegration && canManageSpaces && (
              <EuiDescribedFormGroup
                fullWidth
                data-test-subj="aiFeatureVisibilitySection"
                title={
                  <h3 data-test-subj="aiFeatureVisibilityTitle">
                    <FormattedMessage
                      id="genAiSettings.aiFeatureVisibilityLabel"
                      defaultMessage="AI feature visibility"
                    />
                  </h3>
                }
                description={
                  <p>
                    {isPermissionsBased ? (
                      <FormattedMessage
                        id="genAiSettings.solutionViewDescriptionLabel"
                        defaultMessage="Turn AI-powered features on or off (for custom roles only) on the {permissionsTab} in the {spaces} settings. Create custom roles at {rolesLink}."
                        values={{
                          permissionsTab: (
                            <strong>
                              <FormattedMessage
                                id="genAiSettings.permissionsTab"
                                defaultMessage="Permissions tab"
                              />
                            </strong>
                          ),
                          spaces: (
                            <strong>
                              <FormattedMessage
                                id="genAiSettings.spacesLabel"
                                defaultMessage="Spaces"
                              />
                            </strong>
                          ),
                          rolesLink: (
                            <EuiLink
                              href={application.getUrlForApp('management', {
                                path: '/security/roles',
                              })}
                            >
                              <FormattedMessage
                                id="genAiSettings.rolesLink"
                                defaultMessage="Stack Management > Roles"
                              />
                            </EuiLink>
                          ),
                        }}
                      />
                    ) : (
                      <FormattedMessage
                        id="genAiSettings.showAIAssistantDescriptionLabel"
                        defaultMessage="Enable or disable AI-powered features in {space} settings."
                        values={{
                          space: (
                            <strong>
                              <FormattedMessage
                                id="genAiSettings.spacesLabel"
                                defaultMessage="Space"
                              />
                            </strong>
                          ),
                        }}
                      />
                    )}
                  </p>
                }
              >
                <EuiFormRow fullWidth>
                  <GoToSpacesButton
                    onNavigateToSpaces={handleNavigateToSpaces}
                    navigateToPermissions={isPermissionsBased}
                  />
                </EuiFormRow>
              </EuiDescribedFormGroup>
            )}
            {showAiAssistantsVisibilitySetting && (
              <EuiFlexItem>
                <AIAssistantVisibility />
              </EuiFlexItem>
            )}
          </EuiPanel>
        </EuiPageSection>
      </div>
      {!isEmpty(unsavedChanges) && (
        <BottomBarActions
          isLoading={isSaving}
          onDiscardChanges={cleanUnsavedChanges}
          onSave={handleSave}
          saveLabel={i18n.translate('xpack.gen_ai_settings.settings.saveButton', {
            defaultMessage: 'Save changes',
          })}
          unsavedChangesCount={Object.keys(unsavedChanges).length}
          appTestSubj="genAiSettingsSaveBar"
        />
      )}
    </>
  );
};
