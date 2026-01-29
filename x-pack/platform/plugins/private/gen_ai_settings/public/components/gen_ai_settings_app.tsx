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
  EuiSplitPanel,
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTitle,
  EuiLink,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';

import { getSpaceIdFromPath } from '@kbn/spaces-utils';
import { isEmpty } from 'lodash';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AGENT_BUILDER_EVENT_TYPES } from '@kbn/agent-builder-common/telemetry';
import { useEnabledFeatures } from '../contexts/enabled_features_context';
import { useKibana } from '../hooks/use_kibana';
import { GoToSpacesButton } from './go_to_spaces_button';
import { useGenAiConnectors } from '../hooks/use_genai_connectors';
import { getElasticManagedLlmConnector } from '../utils/get_elastic_managed_llm_connector';
import { useSettingsContext } from '../contexts/settings_context';
import { DefaultAIConnector } from './default_ai_connector/default_ai_connector';
import { BottomBarActions } from './bottom_bar_actions/bottom_bar_actions';
import { AIAssistantVisibility } from './ai_assistant_visibility/ai_assistant_visibility';
import { ChatExperience } from './chat_experience/chat_experience';
import { DocumentationSection } from './documentation';

interface GenAiSettingsAppProps {
  setBreadcrumbs: ManagementAppMountParams['setBreadcrumbs'];
}

const TELEMETRY_SOURCE = 'stack_management' as const;

const isAIChatExperience = (value: unknown): value is AIChatExperience =>
  typeof value === 'string' &&
  (value === AIChatExperience.Classic || value === AIChatExperience.Agent);

export const GenAiSettingsApp: React.FC<GenAiSettingsAppProps> = ({ setBreadcrumbs }) => {
  const { services } = useKibana();
  const { application, http, docLinks, productDocBase, analytics } = services;
  const {
    showSpacesIntegration,
    isPermissionsBased,
    showAiBreadcrumb,
    showAiAssistantsVisibilitySetting,
    showChatExperienceSetting,
  } = useEnabledFeatures();
  const { euiTheme } = useEuiTheme();
  const { fields, unsavedChanges, isSaving, cleanUnsavedChanges, saveAll } = useSettingsContext();

  // Determine current chat experience (including unsaved changes)
  const chatExperienceField = fields[AI_CHAT_EXPERIENCE_TYPE];
  const currentChatExperience =
    unsavedChanges[AI_CHAT_EXPERIENCE_TYPE]?.unsavedValue ??
    chatExperienceField?.savedValue ??
    chatExperienceField?.defaultValue ??
    AIChatExperience.Classic;
  const isAgentExperience = currentChatExperience === AIChatExperience.Agent;
  const hasAgentBuilderPrivileges = application.capabilities.agentBuilder?.manageAgents === true;

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

  const connectorDescription = useMemo(() => {
    if (!hasElasticManagedLlm) {
      return (
        <p>
          <FormattedMessage
            id="genAiSettings.aiConnectorDescription"
            defaultMessage={`AI-powered features require a large language model (LLM) connector. You can use the Elastic Managed LLM ({atAdditionalCost}) or configure a third-party connector.
              When you set a default AI connector, it is pre-selected for all of these features in this space.
              If you haven't set a default, the most recently used connector is selected automatically. {manageConnectors}`}
            values={{
              manageConnectors: (
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
              ),
              atAdditionalCost: (
                <EuiLink
                  href={docLinks?.links?.observability?.elasticManagedLlmUsageCost}
                  target="_blank"
                >
                  <FormattedMessage
                    id="genAiSettings.additionalCostLink"
                    defaultMessage="at additional cost"
                  />
                </EuiLink>
              ),
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
          defaultMessage={`A large language model (LLM) is required to power the AI Assistant and AI-powered features. By default, Elastic uses its {preconfiguredConnectors} ({link}) when no custom connectors are available. When available, Elastic uses the last used custom connector.${
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
            manageConnectors: (
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
            ),
            preconfiguredConnectors: (
              <strong>
                <FormattedMessage
                  id="genAiSettings.preconfiguredConnectors"
                  defaultMessage="pre-configured AI connectors"
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
  ]);

  async function handleSave() {
    const savedChatExperience = isAIChatExperience(chatExperienceField?.savedValue)
      ? chatExperienceField.savedValue
      : undefined;
    const defaultChatExperience = isAIChatExperience(chatExperienceField?.defaultValue)
      ? (chatExperienceField.defaultValue as AIChatExperience)
      : undefined;
    const unsavedChatExperience = isAIChatExperience(
      unsavedChanges[AI_CHAT_EXPERIENCE_TYPE]?.unsavedValue
    )
      ? (unsavedChanges[AI_CHAT_EXPERIENCE_TYPE]?.unsavedValue as AIChatExperience)
      : undefined;
    const normalizedSavedChatExperience = savedChatExperience ?? AIChatExperience.Classic;

    // Telemetry should compare the effective "before" and "after" values.
    // - "before" should include the default if there is no saved value.
    // - "after" should reflect the unsaved change, or fall back to "before" if unchanged.
    const telemetryBeforeChatExperience =
      savedChatExperience ?? defaultChatExperience ?? AIChatExperience.Classic;
    const telemetryAfterChatExperience = unsavedChatExperience ?? telemetryBeforeChatExperience;
    const shouldTrackOptInConfirmed =
      telemetryBeforeChatExperience !== AIChatExperience.Agent &&
      telemetryAfterChatExperience === AIChatExperience.Agent;
    const shouldTrackOptOut =
      telemetryBeforeChatExperience === AIChatExperience.Agent &&
      telemetryAfterChatExperience !== AIChatExperience.Agent;

    const needsReload = await saveAll();
    if (shouldTrackOptInConfirmed) {
      analytics?.reportEvent(AGENT_BUILDER_EVENT_TYPES.OptInAction, {
        action: 'confirmed',
        source: TELEMETRY_SOURCE,
      });
    }
    if (shouldTrackOptOut) {
      analytics?.reportEvent(AGENT_BUILDER_EVENT_TYPES.OptOut, {
        source: TELEMETRY_SOURCE,
      });
    }
    if (needsReload) {
      // Only skip `step_reached` after reload if it could have been reported on this page load.
      // This prevents suppressing the Agent -> Classic transition, where `step_reached` should be
      // emitted after reload.
      const shouldSkipStepReachedOnReload =
        normalizedSavedChatExperience === AIChatExperience.Classic &&
        !(savedChatExperience === undefined && defaultChatExperience === AIChatExperience.Agent);

      if (shouldSkipStepReachedOnReload) {
        try {
          // We reload the page after saving; without this one-shot flag, `ChatExperience` would emit
          // `step_reached` both before and after the reload.
          window.sessionStorage.setItem('gen_ai_settings:skip_step_reached_once', `${Date.now()}`);
        } catch {
          // ignore
        }
      }
      window.location.reload();
    }
  }

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
          <EuiSplitPanel.Outer hasBorder grow={false}>
            <EuiSplitPanel.Inner color="subdued">
              <EuiTitle size="s">
                <h3 data-test-subj="generalSectionTitle">
                  <FormattedMessage id="genAiSettings.general.title" defaultMessage="General" />
                </h3>
              </EuiTitle>
            </EuiSplitPanel.Inner>
            <EuiSplitPanel.Inner>
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
                      <DefaultAIConnector connectors={connectors} />
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
                          defaultMessage="You can enable or disable AI-powered features from the {space} settings page."
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
              {showChatExperienceSetting && (
                <EuiFlexItem>
                  <ChatExperience />
                </EuiFlexItem>
              )}
              {showAiAssistantsVisibilitySetting && (
                <EuiFlexItem>
                  <AIAssistantVisibility />
                </EuiFlexItem>
              )}
            </EuiSplitPanel.Inner>
          </EuiSplitPanel.Outer>

          {isAgentExperience && (showChatExperienceSetting || hasAgentBuilderPrivileges) && (
            <>
              <EuiSpacer size="l" />

              <DocumentationSection productDocBase={productDocBase} />
            </>
          )}
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
