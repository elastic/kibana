/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiSpacer,
  EuiSplitPanel,
  EuiTitle,
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiSwitch,
  EuiRadioGroup,
  EuiButton,
  EuiCallOut,
  EuiLoadingSpinner,
  EuiText,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { HttpSetup } from '@kbn/core/public';
import type { NotificationsStart } from '@kbn/core/public';
import { useAnonymizationSettings } from './use_anonymization_settings';
import { PatternsFlyout } from './patterns_flyout';
import type { FailureMode } from './types';

interface AnonymizationSectionProps {
  http: HttpSetup;
  notifications: NotificationsStart;
  canManage: boolean;
}

const FAILURE_MODE_OPTIONS = [
  {
    id: 'block',
    label: i18n.translate('xpack.inferenceWorkflows.anonymization.failureMode.block', {
      defaultMessage: 'Block the request',
    }),
  },
  {
    id: 'allow_unsafe',
    label: i18n.translate('xpack.inferenceWorkflows.anonymization.failureMode.allowUnsafe', {
      defaultMessage: 'Allow the request (unsafe — PII may reach the model)',
    }),
  },
];

export const AnonymizationSection: React.FC<AnonymizationSectionProps> = ({
  http,
  notifications,
  canManage,
}) => {
  const { settings, isLoading, error, saveSettings, isSaving } = useAnonymizationSettings(http);
  const [flyoutOpen, setFlyoutOpen] = useState(false);

  if (isLoading) {
    return (
      <>
        <EuiSpacer size="l" />
        <EuiSplitPanel.Outer hasBorder grow={false}>
          <EuiSplitPanel.Inner color="subdued">
            <EuiTitle size="s">
              <h3>
                <FormattedMessage
                  id="xpack.inferenceWorkflows.anonymization.sectionTitle"
                  defaultMessage="Anonymization"
                />
              </h3>
            </EuiTitle>
          </EuiSplitPanel.Inner>
          <EuiSplitPanel.Inner>
            <EuiLoadingSpinner size="m" />
          </EuiSplitPanel.Inner>
        </EuiSplitPanel.Outer>
      </>
    );
  }

  if (error || !settings) {
    return null;
  }

  const { managementState, enabled, builtInRules, customRules, failureMode, baseFailureMode } =
    settings;

  const isEditable = managementState === 'intact' || managementState === 'disabled';
  const effectiveFailureMode = failureMode ?? baseFailureMode;

  const handleToggle = async (nextEnabled: boolean) => {
    try {
      await saveSettings({ enabled: nextEnabled });
    } catch (err) {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.inferenceWorkflows.anonymization.toggleError', {
          defaultMessage: 'Failed to update anonymization setting',
        }),
        text: err?.body?.message ?? err?.message,
      });
    }
  };

  const handleFailureModeChange = async (id: string) => {
    try {
      await saveSettings({ failureMode: id as FailureMode });
    } catch (err) {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.inferenceWorkflows.anonymization.failureModeError', {
          defaultMessage: 'Failed to update failure mode',
        }),
        text: err?.body?.message ?? err?.message,
      });
    }
  };

  const handlePatternsSave = async (patch: {
    builtInRules?: typeof builtInRules;
    customRules?: typeof customRules;
  }) => {
    await saveSettings(patch);
  };

  const enabledCount = builtInRules.filter((r) => r.enabled).length + customRules.filter((r) => r.enabled).length;

  return (
    <>
      <EuiSpacer size="l" />
      <EuiSplitPanel.Outer hasBorder grow={false} data-test-subj="anonymizationSection">
        <EuiSplitPanel.Inner color="subdued">
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h3 data-test-subj="anonymizationSectionTitle">
                  <FormattedMessage
                    id="xpack.inferenceWorkflows.anonymization.sectionTitle"
                    defaultMessage="Anonymization"
                  />
                </h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="warning">
                <FormattedMessage
                  id="xpack.inferenceWorkflows.anonymization.designPreview"
                  defaultMessage="Design preview"
                />
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiSplitPanel.Inner>

        <EuiSplitPanel.Inner>
          {!isEditable && (
            <>
              <EuiCallOut
                title={i18n.translate(
                  'xpack.inferenceWorkflows.anonymization.readOnlyCallout.title',
                  {
                    defaultMessage: 'Anonymization is managed outside this page',
                  }
                )}
                color="warning"
                iconType="warning"
                data-test-subj="anonymizationReadOnlyCallout"
              >
                <p>
                  <FormattedMessage
                    id="xpack.inferenceWorkflows.anonymization.readOnlyCallout.body"
                    defaultMessage="The anonymization workflow for this space has been cloned or modified directly. Use the Workflows editor to manage its configuration. Changes made here will not take effect."
                  />
                </p>
              </EuiCallOut>
              <EuiSpacer size="m" />
            </>
          )}

          <EuiDescribedFormGroup
            fullWidth
            title={
              <h4>
                <FormattedMessage
                  id="xpack.inferenceWorkflows.anonymization.maskingToggle.title"
                  defaultMessage="Mask PII in AI requests"
                />
              </h4>
            }
            description={
              <FormattedMessage
                id="xpack.inferenceWorkflows.anonymization.maskingToggle.description"
                defaultMessage="When enabled, sensitive values in prompts sent to AI connectors are replaced with tokens before leaving Kibana. The original values are restored in the model's response."
              />
            }
          >
            <EuiFormRow fullWidth>
              <EuiSwitch
                label={
                  enabled
                    ? i18n.translate('xpack.inferenceWorkflows.anonymization.maskingToggle.on', {
                        defaultMessage: 'Masking enabled',
                      })
                    : i18n.translate('xpack.inferenceWorkflows.anonymization.maskingToggle.off', {
                        defaultMessage: 'Masking disabled',
                      })
                }
                checked={enabled}
                onChange={(e) => handleToggle(e.target.checked)}
                disabled={!canManage || !isEditable || isSaving}
                data-test-subj="anonymizationMaskingToggle"
              />
            </EuiFormRow>
          </EuiDescribedFormGroup>

          {enabled && (
            <>
              <EuiDescribedFormGroup
                fullWidth
                title={
                  <h4>
                    <FormattedMessage
                      id="xpack.inferenceWorkflows.anonymization.failureMode.title"
                      defaultMessage="If masking cannot run"
                    />
                  </h4>
                }
                description={
                  <FormattedMessage
                    id="xpack.inferenceWorkflows.anonymization.failureMode.description"
                    defaultMessage="Controls what happens when the anonymization step encounters an error or times out. {baseNote}"
                    values={{
                      baseNote:
                        failureMode === undefined ? (
                          <EuiText size="xs" color="subdued" component="span">
                            <FormattedMessage
                              id="xpack.inferenceWorkflows.anonymization.failureMode.inheritNote"
                              defaultMessage="Using cluster default: {mode}."
                              values={{
                                mode: (
                                  <strong>
                                    {baseFailureMode === 'block'
                                      ? i18n.translate(
                                          'xpack.inferenceWorkflows.anonymization.failureMode.blockShort',
                                          { defaultMessage: 'Block' }
                                        )
                                      : i18n.translate(
                                          'xpack.inferenceWorkflows.anonymization.failureMode.allowShort',
                                          { defaultMessage: 'Allow' }
                                        )}
                                  </strong>
                                ),
                              }}
                            />
                          </EuiText>
                        ) : null,
                    }}
                  />
                }
              >
                <EuiFormRow fullWidth>
                  <EuiRadioGroup
                    options={FAILURE_MODE_OPTIONS}
                    idSelected={effectiveFailureMode}
                    onChange={handleFailureModeChange}
                    disabled={!canManage || !isEditable || isSaving}
                    data-test-subj="anonymizationFailureModeGroup"
                  />
                </EuiFormRow>
                {failureMode !== undefined && canManage && isEditable && (
                  <EuiFormRow fullWidth>
                    <EuiText size="xs">
                      <button
                        style={{ textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                        onClick={() => saveSettings({ failureMode: undefined })}
                        data-test-subj="anonymizationFailureModeReset"
                      >
                        <FormattedMessage
                          id="xpack.inferenceWorkflows.anonymization.failureMode.reset"
                          defaultMessage="Reset to cluster default ({mode})"
                          values={{
                            mode: baseFailureMode === 'block' ? 'Block' : 'Allow',
                          }}
                        />
                      </button>
                    </EuiText>
                  </EuiFormRow>
                )}
              </EuiDescribedFormGroup>

              <EuiDescribedFormGroup
                fullWidth
                title={
                  <h4>
                    <FormattedMessage
                      id="xpack.inferenceWorkflows.anonymization.patterns.title"
                      defaultMessage="Anonymization patterns"
                    />
                  </h4>
                }
                description={
                  <FormattedMessage
                    id="xpack.inferenceWorkflows.anonymization.patterns.description"
                    defaultMessage="{count} active {count, plural, one {pattern} other {patterns}} — {builtInCount} built-in, {customCount} custom."
                    values={{
                      count: enabledCount,
                      builtInCount: builtInRules.filter((r) => r.enabled).length,
                      customCount: customRules.filter((r) => r.enabled).length,
                    }}
                  />
                }
              >
                <EuiFormRow fullWidth>
                  <EuiButton
                    size="s"
                    onClick={() => setFlyoutOpen(true)}
                    data-test-subj="anonymizationManagePatternsButton"
                  >
                    <FormattedMessage
                      id="xpack.inferenceWorkflows.anonymization.patterns.manage"
                      defaultMessage="Manage patterns"
                    />
                  </EuiButton>
                </EuiFormRow>
              </EuiDescribedFormGroup>
            </>
          )}
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>

      {flyoutOpen && (
        <PatternsFlyout
          http={http}
          builtInRules={builtInRules}
          customRules={customRules}
          canManage={canManage && isEditable}
          onSave={handlePatternsSave}
          onClose={() => setFlyoutOpen(false)}
        />
      )}
    </>
  );
};
