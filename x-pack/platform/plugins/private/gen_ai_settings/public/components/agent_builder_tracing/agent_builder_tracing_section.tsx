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
  AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID,
} from '@kbn/management-settings-ids';
import { useSettingsContext } from '../../contexts/settings_context';
import { useKibana } from '../../hooks/use_kibana';
import { useTracingEnabledState } from './use_tracing_enabled_state';

export const AgentBuilderTracingSection: React.FC = () => {
  const { fields, handleFieldChange, unsavedChanges } = useSettingsContext();
  const {
    services: { settings, notifications, docLinks, application },
  } = useKibana();

  const canEditAdvancedSettings = application.capabilities.advancedSettings?.save;
  const isExperimentalFeaturesEnabled = settings.client.get(
    AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID,
    false
  );

  const { tracingEnabledField, tracingEnabled, handleTracingEnabledChange } =
    useTracingEnabledState();

  if (!tracingEnabledField || !isExperimentalFeaturesEnabled) {
    return null;
  }

  const rolesUrl = application.getUrlForApp('management', {
    path: '/security/roles',
  });

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
              onFieldChange={handleTracingEnabledChange}
              unsavedChange={unsavedChanges[AGENT_BUILDER_TRACING_ENABLED_SETTING_ID]}
            />

            {tracingEnabled && (
              <>
                <EuiSpacer size="s" />
                <EuiText size="s" color="subdued">
                  <FormattedMessage
                    id="xpack.genAiSettings.agentBuilderTracing.accessControl"
                    defaultMessage="Trace data is readable by anyone with index access. To restrict it, configure index-level permissions in {rolesLink}."
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
                      index1: <code>traces-agent_builder.otel-*</code>,
                      index2: <code>logs-agent_builder.otel-*</code>,
                    }}
                  />
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
                        defaultMessage="Choose what sensitive content is included in Agent Builder traces."
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
