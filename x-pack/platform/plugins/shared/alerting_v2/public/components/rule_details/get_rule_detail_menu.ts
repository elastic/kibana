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
  const viewChangeHistoryItem: RuleDetailMenuItem | undefined = onViewChangeHistory
    ? {
        id: 'viewChangeHistory',
        label: i18n.translate('xpack.alertingV2.ruleDetails.viewChangeHistoryButtonLabel', {
          defaultMessage: 'View change history',
        }),
        iconType: 'clockCounter',
        order: 2,
        run: onViewChangeHistory,
        testId: 'ruleDetailsViewChangeHistoryButton',
        overflow: true,
      }
    : undefined;

  // Read-only users only get read actions; no write affordances.
  if (!canWrite) {
    return { items: viewChangeHistoryItem ? [viewChangeHistoryItem] : [] };
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
    // Order mirrors the rules list overflow: Run / Clone | View change history / Update API key | Delete.
    // Feedback stays a global static item (app menu draws its own separator above it).
    items: [
      {
        id: 'runRule',
        label: i18n.translate('xpack.alertingV2.ruleDetails.runRuleButtonLabel', {
          defaultMessage: 'Run',
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
          defaultMessage: 'Clone',
        }),
        iconType: 'copy',
        order: 1,
        run: onClone,
        testId: 'ruleDetailsCloneButton',
        overflow: true,
      },
      ...(viewChangeHistoryItem ? [{ ...viewChangeHistoryItem, separator: 'above' as const }] : []),
      {
        id: 'updateRuleApiKey',
        label: i18n.translate('xpack.alertingV2.ruleDetails.updateApiKeyButtonLabel', {
          defaultMessage: 'Update API key',
        }),
        iconType: 'key',
        order: 3,
        // When change history is absent, still divide primary actions from API key.
        ...(viewChangeHistoryItem ? {} : { separator: 'above' as const }),
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
      {
        id: 'deleteRule',
        label: i18n.translate('xpack.alertingV2.ruleDetails.deleteRuleButtonLabel', {
          defaultMessage: 'Delete',
        }),
        iconType: 'trash',
        order: 4,
        separator: 'above',
        isDestructive: true,
        run: onDelete,
        testId: 'ruleDetailsDeleteButton',
        overflow: true,
      },
    ],
  };
};
