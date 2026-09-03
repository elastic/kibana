/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderMenu } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import type { RuleApiResponse } from '../../services/rules_api';

type RuleDetailMenuItem = NonNullable<AppHeaderMenu['items']>[number];

export interface GetRuleDetailMenuParams {
  rule: RuleApiResponse;
  /** Gates write actions (edit, enable/disable, run, clone, delete); read actions always show. */
  canWrite: boolean;
  onEdit: () => void;
  onToggleEnabled: (enabled: boolean) => void;
  isToggleLoading: boolean;
  onClone: () => void;
  onDelete: () => void;
  onRun: () => void;
  /** When provided, adds a More-menu entry that opens change history (read action). */
  onViewChangeHistory?: () => void;
  onUpdateApiKey: () => void;
}

export const getRuleDetailMenu = ({
  rule,
  canWrite,
  onEdit,
  onToggleEnabled,
  isToggleLoading,
  onClone,
  onDelete,
  onRun,
  onViewChangeHistory,
  onUpdateApiKey,
}: GetRuleDetailMenuParams): AppHeaderMenu => {
  const viewChangeHistoryItems: RuleDetailMenuItem[] = onViewChangeHistory
    ? [
        {
          id: 'viewChangeHistory',
          label: i18n.translate('xpack.alertingV2.ruleDetails.viewChangeHistoryButtonLabel', {
            defaultMessage: 'View change history',
          }),
          iconType: 'clockCounter',
          order: 2,
          run: onViewChangeHistory,
          testId: 'ruleDetailsViewChangeHistoryButton',
          overflow: true,
        },
      ]
    : [];

  // Read-only users only get read actions; no write affordances.
  if (!canWrite) {
    return { items: viewChangeHistoryItems };
  }

  return {
    primaryActionItem: {
      id: 'editRule',
      label: i18n.translate('xpack.alertingV2.sections.ruleDetails.editRuleButtonLabel', {
        defaultMessage: 'Edit rule',
      }),
      iconType: 'pencil',
      run: onEdit,
      testId: 'openEditRuleFlyoutButton',
    },
    switch: {
      id: 'ruleEnabled',
      label: rule.enabled
        ? i18n.translate('xpack.alertingV2.ruleDetails.enabled', {
            defaultMessage: 'Enabled',
          })
        : i18n.translate('xpack.alertingV2.ruleDetails.disabled', {
            defaultMessage: 'Disabled',
          }),
      labelProps: undefined,
      checked: rule.enabled,
      onChange: onToggleEnabled,
      disabled: isToggleLoading,
      'data-test-subj': 'ruleDetailsEnabledSwitch',
    },
    items: [
      {
        id: 'runRule',
        label: i18n.translate('xpack.alertingV2.ruleDetails.runRuleButtonLabel', {
          defaultMessage: 'Run rule',
        }),
        iconType: 'play',
        order: 0,
        run: onRun,
        testId: 'ruleDetailsRunButton',
        overflow: true,
        disableButton: !rule.enabled,
        tooltipContent: rule.enabled
          ? undefined
          : i18n.translate('xpack.alertingV2.ruleDetails.runRuleDisabledTooltip', {
              defaultMessage: 'Enable the rule to run it',
            }),
      },
      {
        id: 'cloneRule',
        label: i18n.translate('xpack.alertingV2.ruleDetails.cloneRuleButtonLabel', {
          defaultMessage: 'Clone rule',
        }),
        iconType: 'copy',
        order: 1,
        run: onClone,
        testId: 'ruleDetailsCloneButton',
        overflow: true,
      },
      {
        id: 'updateRuleApiKey',
        label: i18n.translate('xpack.alertingV2.ruleDetails.updateApiKeyButtonLabel', {
          defaultMessage: 'Update API key',
        }),
        iconType: 'key',
        order: 1,
        run: onUpdateApiKey,
        testId: 'ruleDetailsUpdateApiKeyButton',
        overflow: true,
        disableButton: !rule.enabled,
        tooltipContent: rule.enabled
          ? undefined
          : i18n.translate('xpack.alertingV2.ruleDetails.updateApiKeyDisabledTooltip', {
              defaultMessage: 'Enable the rule to update its API key',
            }),
      },
      ...viewChangeHistoryItems,
      {
        id: 'deleteRule',
        label: i18n.translate('xpack.alertingV2.ruleDetails.deleteRuleButtonLabel', {
          defaultMessage: 'Delete rule',
        }),
        iconType: 'trash',
        order: 3,
        run: onDelete,
        testId: 'ruleDetailsDeleteButton',
        overflow: true,
      },
    ],
  };
};
