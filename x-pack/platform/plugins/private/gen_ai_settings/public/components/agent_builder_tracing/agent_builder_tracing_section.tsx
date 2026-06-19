/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiHorizontalRule,
  EuiLink,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { FieldRow, FieldRowProvider } from '@kbn/management-settings-components-field-row';
import {
  AGENT_BUILDER_TRACING_ENABLED_SETTING_ID,
  AGENT_BUILDER_TRACING_USER_PROMPTS_SETTING_ID,
  AGENT_BUILDER_TRACING_LLM_RESPONSES_SETTING_ID,
  AGENT_BUILDER_TRACING_SYSTEM_PROMPT_SETTING_ID,
  AGENT_BUILDER_TRACING_REAL_NAMES_SETTING_ID,
  AGENT_BUILDER_TRACING_REAL_IDS_SETTING_ID,
} from '@kbn/management-settings-ids';
import { useSettingsContext } from '../../contexts/settings_context';
import { useKibana } from '../../hooks/use_kibana';

export const AgentBuilderTracingSection: React.FC = () => {
  const { fields, handleFieldChange, unsavedChanges } = useSettingsContext();
  const {
    services: { settings, notifications, docLinks, application },
  } = useKibana();

  const canEditAdvancedSettings = application.capabilities.advancedSettings?.save;

  const tracingEnabledField = fields[AGENT_BUILDER_TRACING_ENABLED_SETTING_ID];

  if (!tracingEnabledField) {
    return null;
  }

  const rolesUrl = application.getUrlForApp('management', {
    path: '/security/roles',
  });

  const tracingEnabledUnsaved = unsavedChanges[AGENT_BUILDER_TRACING_ENABLED_SETTING_ID];
  const tracingEnabled =
    tracingEnabledUnsaved?.unsavedValue !== undefined
      ? Boolean(tracingEnabledUnsaved.unsavedValue)
      : Boolean(tracingEnabledField.savedValue ?? tracingEnabledField.defaultValue);

  return (
    <>
      <EuiSpacer size="l" />
      <EuiSplitPanel.Outer hasBorder grow={false}>
        <EuiSplitPanel.Inner color="subdued">
          <EuiTitle size="s">
            <h3 data-test-subj="agentBuilderTracingSectionTitle">
              <FormattedMessage
                id="xpack.genAiSettings.agentBuilderTracing.sectionTitle"
                defaultMessage="Agent Builder Traces"
              />
            </h3>
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
              onFieldChange={handleFieldChange}
              unsavedChange={unsavedChanges[AGENT_BUILDER_TRACING_ENABLED_SETTING_ID]}
            />

            {tracingEnabled && (
              <>
                <EuiSpacer size="s" />
                <EuiText size="s" color="subdued">
                  <p>
                    <FormattedMessage
                      id="xpack.genAiSettings.agentBuilderTracing.accessControl"
                      defaultMessage="Trace data is stored in {index} and is not access-restricted by default. Configure index-level permissions in {rolesLink}."
                      values={{
                        index: <code>traces-agent_builder.otel-*</code>,
                        rolesLink: (
                          <EuiLink href={rolesUrl}>
                            <FormattedMessage
                              id="xpack.genAiSettings.agentBuilderTracing.rolesLink"
                              defaultMessage="Stack Management → Security → Roles"
                            />
                          </EuiLink>
                        ),
                      }}
                    />
                  </p>
                </EuiText>
                <EuiSpacer size="m" />

                <EuiAccordion
                  id="agentBuilderTracingAdvanced"
                  buttonContent={
                    <FormattedMessage
                      id="xpack.genAiSettings.agentBuilderTracing.advancedLabel"
                      defaultMessage="Advanced privacy settings"
                    />
                  }
                  paddingSize="s"
                >
                  <EuiSpacer size="s" />
                  <EuiText size="s" color="subdued">
                    <p>
                      <FormattedMessage
                        id="xpack.genAiSettings.agentBuilderTracing.contentDescription"
                        defaultMessage="By default, traces contain only structural metadata (token counts, latency, model identifiers). Enable the options below to include conversation content or real identifiers."
                      />
                    </p>
                  </EuiText>
                  <EuiSpacer size="m" />

                  {fields[AGENT_BUILDER_TRACING_USER_PROMPTS_SETTING_ID] && (
                    <FieldRow
                      field={fields[AGENT_BUILDER_TRACING_USER_PROMPTS_SETTING_ID]}
                      isSavingEnabled={!!canEditAdvancedSettings}
                      onFieldChange={handleFieldChange}
                      unsavedChange={unsavedChanges[AGENT_BUILDER_TRACING_USER_PROMPTS_SETTING_ID]}
                    />
                  )}

                  {fields[AGENT_BUILDER_TRACING_LLM_RESPONSES_SETTING_ID] && (
                    <FieldRow
                      field={fields[AGENT_BUILDER_TRACING_LLM_RESPONSES_SETTING_ID]}
                      isSavingEnabled={!!canEditAdvancedSettings}
                      onFieldChange={handleFieldChange}
                      unsavedChange={unsavedChanges[AGENT_BUILDER_TRACING_LLM_RESPONSES_SETTING_ID]}
                    />
                  )}

                  {fields[AGENT_BUILDER_TRACING_SYSTEM_PROMPT_SETTING_ID] && (
                    <FieldRow
                      field={fields[AGENT_BUILDER_TRACING_SYSTEM_PROMPT_SETTING_ID]}
                      isSavingEnabled={!!canEditAdvancedSettings}
                      onFieldChange={handleFieldChange}
                      unsavedChange={unsavedChanges[AGENT_BUILDER_TRACING_SYSTEM_PROMPT_SETTING_ID]}
                    />
                  )}

                  <EuiHorizontalRule margin="s" />

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
              </>
            )}
          </FieldRowProvider>
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    </>
  );
};
