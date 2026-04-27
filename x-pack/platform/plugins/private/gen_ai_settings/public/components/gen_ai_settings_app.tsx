/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useCallback } from 'react';
import {
  EuiPageSection,
  EuiSpacer,
  EuiSplitPanel,
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiTitle,
  EuiLink,
  EuiFlexItem,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { getSpaceIdFromPath } from '@kbn/spaces-utils';
import { isEmpty } from 'lodash';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { useEnabledFeatures } from '../contexts/enabled_features_context';
import { useKibana } from '../hooks/use_kibana';
import { GoToSpacesButton } from './go_to_spaces_button';
import { useSettingsContext } from '../contexts/settings_context';
import { BottomBarActions } from './bottom_bar_actions/bottom_bar_actions';
import { AIAssistantVisibility } from './ai_assistant_visibility/ai_assistant_visibility';
import { ChatExperience } from './chat_experience/chat_experience';
import { PrePromptWorkflowSection } from './pre_prompt_workflow_section';
import { DocumentationSection } from './documentation';
import { AnonymizationProfilesSection } from './anonymization_profiles_section';
import { TokenUsageTracking } from './token_usage_tracking/token_usage_tracking';
import { useSaveWithTelemetry } from '../hooks/use_save_with_telemetry';

interface GenAiSettingsAppProps {
  setBreadcrumbs: ManagementAppMountParams['setBreadcrumbs'];
}

export const GenAiSettingsApp: React.FC<GenAiSettingsAppProps> = ({ setBreadcrumbs }) => {
  const { services } = useKibana();
  const { application, http, productDocBase, analytics } = services;
  const {
    showSpacesIntegration,
    isPermissionsBased,
    showAiBreadcrumb,
    showAiAssistantsVisibilitySetting,
    showChatExperienceSetting,
    showAnonymizationProfilesSection,
  } = useEnabledFeatures();
  const { euiTheme } = useEuiTheme();
  const { fields, unsavedChanges, isSaving, cleanUnsavedChanges, saveAll } = useSettingsContext();

  // Determine current chat experience (including unsaved changes)
  const chatExperienceField = fields[AI_CHAT_EXPERIENCE_TYPE];
  const currentChatExperience =
    unsavedChanges[AI_CHAT_EXPERIENCE_TYPE]?.unsavedValue ??
    chatExperienceField?.savedValue ??
    chatExperienceField?.defaultValue ??
    AIChatExperience.Agent;
  const isAgentExperience = currentChatExperience === AIChatExperience.Agent;
  const hasAgentBuilderPrivileges = application.capabilities.agentBuilder?.manageAgents === true;

  const canManageSpaces = application.capabilities.management.kibana.spaces;

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

  const handleSave = useSaveWithTelemetry({ fields, unsavedChanges, saveAll, analytics });

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
              {showAiAssistantsVisibilitySetting && !isAgentExperience && (
                <EuiFlexItem>
                  <AIAssistantVisibility />
                </EuiFlexItem>
              )}
              <EuiFlexItem>
                <TokenUsageTracking />
              </EuiFlexItem>
            </EuiSplitPanel.Inner>
          </EuiSplitPanel.Outer>

          <PrePromptWorkflowSection />

          {isAgentExperience && (showChatExperienceSetting || hasAgentBuilderPrivileges) && (
            <>
              <EuiSpacer size="l" />

              <DocumentationSection productDocBase={productDocBase} />
            </>
          )}

          {showAnonymizationProfilesSection && (
            <>
              <EuiSpacer size="l" />
              <EuiSplitPanel.Outer hasBorder grow={false}>
                <EuiSplitPanel.Inner color="subdued">
                  <EuiTitle size="s">
                    <h3 data-test-subj="anonymizationSectionTitle">
                      <FormattedMessage
                        id="genAiSettings.anonymization.sectionTitle"
                        defaultMessage="Anonymization"
                      />
                    </h3>
                  </EuiTitle>
                </EuiSplitPanel.Inner>
                <EuiSplitPanel.Inner>
                  <AnonymizationProfilesSection />
                </EuiSplitPanel.Inner>
              </EuiSplitPanel.Outer>
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
