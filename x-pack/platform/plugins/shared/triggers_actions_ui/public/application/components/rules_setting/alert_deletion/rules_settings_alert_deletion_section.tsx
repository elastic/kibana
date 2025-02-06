/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiDescribedFormGroup,
  EuiEmptyPrompt,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { RulesSettingsAlertDeletionProperties } from '@kbn/alerting-plugin/common';
import React, { memo } from 'react';
import {
  ACTIVE_ALERT_DELETION_LABEL,
  ALERT_DELETION_DESCRIPTION,
  ALERT_DELETION_ERROR_PROMPT_BODY,
  ALERT_DELETION_ERROR_PROMPT_TITLE,
  ALERT_DELETION_TITLE,
  DAYS_LABEL,
  INACTIVE_ALERT_DELETION_LABEL,
  THRESHOLD_LABEL,
} from './translations';

interface Props {
  onChange: (key: keyof RulesSettingsAlertDeletionProperties, value: number | boolean) => void;
  settings: RulesSettingsAlertDeletionProperties;
  canShow: boolean | Readonly<{ [x: string]: boolean }>;
  canWrite: boolean;
  hasError: boolean;
}
export const RulesSettingsAlertDeletionSection = memo((props: Props) => {
  const { onChange, settings, hasError, canShow, canWrite } = props;

  if (!canShow) {
    return null;
  }

  if (hasError) {
    return (
      <EuiEmptyPrompt
        color="danger"
        iconType="warning"
        title={<h4>{ALERT_DELETION_ERROR_PROMPT_TITLE}</h4>}
        body={<p>{ALERT_DELETION_ERROR_PROMPT_BODY}</p>}
      />
    );
  }

  return (
    <EuiForm data-test-subj="rulesSettingsAlertDeletionSection">
      <EuiDescribedFormGroup
        title={<h3>{ALERT_DELETION_TITLE}</h3>}
        description={
          <>
            <EuiText color="subdued" size="s">
              <p>{ALERT_DELETION_DESCRIPTION}</p>
            </EuiText>
            <EuiSpacer size="xl" />
            {/* // TODO: https://github.com/elastic/kibana/issues/209267
            <EuiPanel borderRadius="none" color="subdued">
              <FormattedMessage
                id="xpack.triggersActionsUI.rulesSettings.AlertDeletionLastRun"
                defaultMessage={`Last run was 2 days ago.`}
              />
            </EuiPanel> */}
          </>
        }
      >
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiFormRow label={ACTIVE_ALERT_DELETION_LABEL}>
              <EuiSwitch
                label=""
                checked={settings!.isActiveAlertDeletionEnabled}
                disabled={!canWrite}
                onChange={(e) => {
                  onChange('isActiveAlertDeletionEnabled', e.target.checked);
                }}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow label={THRESHOLD_LABEL}>
              <EuiFieldNumber
                value={settings!.activeAlertDeletionThreshold}
                onChange={(e) => {
                  onChange('activeAlertDeletionThreshold', parseInt(e.target.value, 10));
                }}
                append={[DAYS_LABEL]}
                disabled={!canWrite || !settings!.isActiveAlertDeletionEnabled}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />

        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiFormRow label={INACTIVE_ALERT_DELETION_LABEL}>
              <EuiSwitch
                data-test-subj="rulesSettingsInactiveAlertDeletionSwitch"
                label=""
                checked={settings!.isInactiveAlertDeletionEnabled}
                disabled={!canWrite}
                onChange={(e) => {
                  onChange('isInactiveAlertDeletionEnabled', e.target.checked);
                }}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow label="Threshold">
              <EuiFieldNumber
                value={settings!.inactiveAlertDeletionThreshold}
                onChange={(e) => {
                  onChange('inactiveAlertDeletionThreshold', parseInt(e.target.value, 10));
                }}
                append={[DAYS_LABEL]}
                disabled={!canWrite || !settings!.isInactiveAlertDeletionEnabled}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>

        {/* // TODO: https://github.com/elastic/kibana/issues/209266
        <EuiSpacer size="m" />
        <EuiPanel borderRadius="none" color="subdued">
          {ALERT_DELETION_LAST_RUN}
        </EuiPanel> */}
      </EuiDescribedFormGroup>
    </EuiForm>
  );
});
