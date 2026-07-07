/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { FieldRow, FieldRowProvider } from '@kbn/management-settings-components-field-row';
import {
  AGENT_BUILDER_TRACING_ENABLED_SETTING_ID,
  AGENT_BUILDER_TRACING_USER_PROMPTS_SETTING_ID,
  AGENT_BUILDER_TRACING_LLM_RESPONSES_SETTING_ID,
  AGENT_BUILDER_TRACING_TOOL_DETAILS_SETTING_ID,
  AGENT_BUILDER_TRACING_SYSTEM_PROMPT_SETTING_ID,
  AGENT_BUILDER_TRACING_REAL_NAMES_SETTING_ID,
  AGENT_BUILDER_TRACING_REAL_IDS_SETTING_ID,
} from '@kbn/management-settings-ids';
import { useSettingsContext } from '../../contexts/settings_context';
import { useKibana } from '../../hooks/use_kibana';
import { useTracingEnabledState } from './use_tracing_enabled_state';
import { useDashboardStatus } from './use_dashboard_status';

export const AgentBuilderTracingSection: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { fields, handleFieldChange, unsavedChanges } = useSettingsContext();
  const {
    services: { settings, notifications, docLinks, application },
  } = useKibana();

  const canEditAdvancedSettings = application.capabilities.advancedSettings?.save;

  const { tracingEnabledField, tracingEnabled, handleTracingEnabledChange } =
    useTracingEnabledState();

  const tracingEnabledSaved = Boolean(
    tracingEnabledField?.savedValue ?? tracingEnabledField?.defaultValue
  );

  const {
    isInstalled,
    dashboardId,
    isLoading: isDashboardLoading,
    isInstalling,
    installDashboard,
  } = useDashboardStatus(tracingEnabledSaved);

  const hasTracingEnabledBeenSaved = !unsavedChanges[AGENT_BUILDER_TRACING_ENABLED_SETTING_ID];

  if (!tracingEnabledField) {
    return null;
  }

  const rolesUrl = application.getUrlForApp('management', {
    path: '/security/roles',
  });

  const dashboardUrl = application.getUrlForApp('dashboards', {
    path: `#/view/${dashboardId}`,
  });

  return (
    <>
      <EuiSpacer size="l" />
      <EuiSplitPanel.Outer hasBorder grow={false}>
        <EuiSplitPanel.Inner color="subdued">
          <EuiTitle size="s">
            <h2 data-test-subj="agentBuilderTracingSectionTitle">
              <FormattedMessage
                id="xpack.genAiSettings.agentBuilderTracing.sectionTitle"
                defaultMessage="Agent Builder Traces"
              />
            </h2>
          </EuiTitle>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner>
          <FieldRowProvider
            links={docLinks.links.management}
            showDanger={(message: string) => notifications.toasts.addDanger(message)}
            validateChange={(key: string, value: unknown) =>
              settings.client.validateValue(key, value)
            }
          >
            <FieldRow
              field={tracingEnabledField}
              isSavingEnabled={!!canEditAdvancedSettings}
              onFieldChange={handleTracingEnabledChange}
              unsavedChange={unsavedChanges[AGENT_BUILDER_TRACING_ENABLED_SETTING_ID]}
            />

            {tracingEnabled && (
              <>
                <EuiPanel color="primary" hasShadow={false} paddingSize="m">
                  <EuiTitle size="xs" css={{ color: euiTheme.colors.primaryText }}>
                    <h4>
                      <FormattedMessage
                        id="xpack.genAiSettings.agentBuilderTracing.aboutTitle"
                        defaultMessage="Trace access and storage"
                      />
                    </h4>
                  </EuiTitle>
                  <EuiSpacer size="s" />
                  <EuiText size="s">
                    <p>
                      <FormattedMessage
                        id="xpack.genAiSettings.agentBuilderTracing.accessControl"
                        defaultMessage="Any user with index access can read trace data. To restrict access, configure index-level permissions in {rolesLink}."
                        values={{
                          rolesLink: (
                            <EuiLink href={rolesUrl}>
                              <FormattedMessage
                                id="xpack.genAiSettings.agentBuilderTracing.rolesLink"
                                defaultMessage="Stack Management > Roles"
                              />
                            </EuiLink>
                          ),
                        }}
                      />
                      <br />
                      <FormattedMessage
                        id="xpack.genAiSettings.agentBuilderTracing.indices"
                        defaultMessage="Traces are stored in {index1} and {index2}"
                        values={{
                          index1: (
                            <code css={{ color: euiTheme.colors.subduedText }}>
                              traces-agent_builder.otel-*
                            </code>
                          ),
                          index2: (
                            <code css={{ color: euiTheme.colors.subduedText }}>
                              logs-agent_builder.otel-*
                            </code>
                          ),
                        }}
                      />
                    </p>
                  </EuiText>
                </EuiPanel>
                <EuiSpacer size="l" />

                <EuiPanel hasBorder hasShadow={false} paddingSize="m">
                  <EuiAccordion
                    id="agentBuilderTracingAdvanced"
                    arrowDisplay="right"
                    buttonContent={
                      <>
                        <EuiTitle size="xs">
                          <h4>
                            <FormattedMessage
                              id="xpack.genAiSettings.agentBuilderTracing.advancedLabel"
                              defaultMessage="Advanced privacy settings"
                            />
                          </h4>
                        </EuiTitle>
                        <EuiSpacer size="xs" />
                        <EuiText size="s" color="subdued">
                          <p>
                            <FormattedMessage
                              id="xpack.genAiSettings.agentBuilderTracing.contentDescription"
                              defaultMessage="Choose what sensitive content is included in Agent Builder traces"
                            />
                          </p>
                        </EuiText>
                      </>
                    }
                    paddingSize="none"
                  >
                    <EuiSpacer size="m" />

                    {fields[AGENT_BUILDER_TRACING_USER_PROMPTS_SETTING_ID] && (
                      <FieldRow
                        field={fields[AGENT_BUILDER_TRACING_USER_PROMPTS_SETTING_ID]}
                        isSavingEnabled={!!canEditAdvancedSettings}
                        onFieldChange={handleFieldChange}
                        unsavedChange={
                          unsavedChanges[AGENT_BUILDER_TRACING_USER_PROMPTS_SETTING_ID]
                        }
                      />
                    )}

                    {fields[AGENT_BUILDER_TRACING_LLM_RESPONSES_SETTING_ID] && (
                      <FieldRow
                        field={fields[AGENT_BUILDER_TRACING_LLM_RESPONSES_SETTING_ID]}
                        isSavingEnabled={!!canEditAdvancedSettings}
                        onFieldChange={handleFieldChange}
                        unsavedChange={
                          unsavedChanges[AGENT_BUILDER_TRACING_LLM_RESPONSES_SETTING_ID]
                        }
                      />
                    )}

                    {fields[AGENT_BUILDER_TRACING_TOOL_DETAILS_SETTING_ID] && (
                      <FieldRow
                        field={fields[AGENT_BUILDER_TRACING_TOOL_DETAILS_SETTING_ID]}
                        isSavingEnabled={!!canEditAdvancedSettings}
                        onFieldChange={handleFieldChange}
                        unsavedChange={
                          unsavedChanges[AGENT_BUILDER_TRACING_TOOL_DETAILS_SETTING_ID]
                        }
                      />
                    )}

                    {fields[AGENT_BUILDER_TRACING_SYSTEM_PROMPT_SETTING_ID] && (
                      <FieldRow
                        field={fields[AGENT_BUILDER_TRACING_SYSTEM_PROMPT_SETTING_ID]}
                        isSavingEnabled={!!canEditAdvancedSettings}
                        onFieldChange={handleFieldChange}
                        unsavedChange={
                          unsavedChanges[AGENT_BUILDER_TRACING_SYSTEM_PROMPT_SETTING_ID]
                        }
                      />
                    )}

                    {fields[AGENT_BUILDER_TRACING_REAL_NAMES_SETTING_ID] && (
                      <FieldRow
                        field={fields[AGENT_BUILDER_TRACING_REAL_NAMES_SETTING_ID]}
                        isSavingEnabled={!!canEditAdvancedSettings}
                        onFieldChange={handleFieldChange}
                        unsavedChange={unsavedChanges[AGENT_BUILDER_TRACING_REAL_NAMES_SETTING_ID]}
                      />
                    )}

                    {fields[AGENT_BUILDER_TRACING_REAL_IDS_SETTING_ID] && (
                      <FieldRow
                        field={fields[AGENT_BUILDER_TRACING_REAL_IDS_SETTING_ID]}
                        isSavingEnabled={!!canEditAdvancedSettings}
                        onFieldChange={handleFieldChange}
                        unsavedChange={unsavedChanges[AGENT_BUILDER_TRACING_REAL_IDS_SETTING_ID]}
                      />
                    )}
                  </EuiAccordion>
                </EuiPanel>
                {hasTracingEnabledBeenSaved && (
                  <>
                    <EuiSpacer size="l" />
                    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
                      <EuiFlexGroup
                        alignItems="center"
                        justifyContent="spaceBetween"
                        responsive={false}
                      >
                        <EuiFlexItem>
                          <EuiTitle size="xs">
                            <h4>
                              <FormattedMessage
                                id="xpack.genAiSettings.agentBuilderTracing.dashboardTitle"
                                defaultMessage="Traces dashboard"
                              />
                            </h4>
                          </EuiTitle>
                          <EuiSpacer size="xs" />
                          <EuiText size="s" color="subdued">
                            <p>
                              {isInstalled ? (
                                <FormattedMessage
                                  id="xpack.genAiSettings.agentBuilderTracing.dashboardDescriptionInstalled"
                                  defaultMessage="View collected traces in the prebuilt Agent Builder dashboard."
                                />
                              ) : (
                                <FormattedMessage
                                  id="xpack.genAiSettings.agentBuilderTracing.dashboardDescriptionNotInstalled"
                                  defaultMessage="Install the prebuilt dashboard to start viewing collected traces."
                                />
                              )}
                            </p>
                          </EuiText>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          {isInstalled ? (
                            <EuiButton
                              href={dashboardUrl}
                              iconType="popout"
                              iconSide="right"
                              data-test-subj="agentBuilderTracingOpenDashboard"
                            >
                              <FormattedMessage
                                id="xpack.genAiSettings.agentBuilderTracing.openDashboardButton"
                                defaultMessage="Open dashboard"
                              />
                            </EuiButton>
                          ) : (
                            <EuiButton
                              onClick={() => installDashboard()}
                              iconType="download"
                              isLoading={isInstalling}
                              isDisabled={isDashboardLoading}
                              data-test-subj="agentBuilderTracingInstallDashboard"
                            >
                              <FormattedMessage
                                id="xpack.genAiSettings.agentBuilderTracing.installDashboardButton"
                                defaultMessage="Install dashboard"
                              />
                            </EuiButton>
                          )}
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiPanel>
                  </>
                )}
              </>
            )}
          </FieldRowProvider>
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    </>
  );
};
