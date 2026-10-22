/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiHorizontalRule,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { AlertDeleteCategoryIds } from '@kbn/alerting-plugin/common/constants/alert_delete';
import { RulesSettingsCallout } from './rules_settings_callout';
import { RulesSettingsForm } from './rules_settings_form';
import { useRulesSettingsForm } from './use_rules_settings_form';

export interface RulesSettingsFlyoutProps {
  isVisible: boolean;
  setUpdatingRulesSettings?: (isUpdating: boolean) => void;
  onClose: () => void;
  onSave?: () => void;
  alertDeleteCategoryIds?: AlertDeleteCategoryIds[];
}

export const RulesSettingsFlyout = memo((props: RulesSettingsFlyoutProps) => {
  const { isVisible, onClose, setUpdatingRulesSettings, onSave, alertDeleteCategoryIds } = props;

  const { euiTheme } = useEuiTheme();
  const form = useRulesSettingsForm({
    enabled: isVisible,
    onClose,
    onSave,
    setUpdatingRulesSettings,
  });
  const { isSaveDisabled, onSave: handleSave, onCancel: onCloseFlyout } = form;

  if (!isVisible) {
    return null;
  }

  return (
    <EuiFlyout
      type="push"
      data-test-subj="rulesSettingsFlyout"
      onClose={onCloseFlyout}
      size="s"
      aria-label={i18n.translate('xpack.triggersActionsUI.rulesSettings.flyout.ruleSettingsLabel', {
        defaultMessage: 'Classic rule settings',
      })}
    >
      <EuiFlyoutHeader>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h3>
                <FormattedMessage
                  id="xpack.triggersActionsUI.rulesSettings.flyout.title"
                  defaultMessage="Settings"
                />
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow" data-test-subj="rulesSettingsFlyoutClassicBadge">
              <FormattedMessage
                id="xpack.triggersActionsUI.rulesSettings.flyout.classicBadge"
                defaultMessage="Classic"
              />
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
      </EuiFlyoutHeader>
      <EuiHorizontalRule margin="none" />

      <div
        css={css`
          padding: ${euiTheme.size.base} ${euiTheme.size.l};
        `}
      >
        <RulesSettingsCallout />
      </div>
      <EuiFlyoutBody>
        <RulesSettingsForm form={form} alertDeleteCategoryIds={alertDeleteCategoryIds} />
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="rulesSettingsFlyoutCancelButton"
              onClick={onCloseFlyout}
            >
              <FormattedMessage
                id="xpack.triggersActionsUI.rulesSettings.flyout.cancelButton"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              data-test-subj="rulesSettingsFlyoutSaveButton"
              onClick={handleSave}
              disabled={isSaveDisabled}
            >
              <FormattedMessage
                id="xpack.triggersActionsUI.rulesSettings.flyout.saveButton"
                defaultMessage="Save"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
});
