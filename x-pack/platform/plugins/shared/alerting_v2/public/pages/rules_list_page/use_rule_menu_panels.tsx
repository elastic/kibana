/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { FlyoutFooterMenuItem, FlyoutFooterMenuPanel } from '@kbn/flyout-template';
import { i18n } from '@kbn/i18n';
import { getRouterLinkProps } from '@kbn/router-utils';
import type { AlertingV2Locators } from '../../application/locator_context';
import type { RuleApiResponse } from '../../services/rules_api';

export const RULE_MENU_ARIA_LABEL = i18n.translate(
  'xpack.alertingV2.rulesList.action.actionsMenu',
  { defaultMessage: 'Rule actions' }
);

export interface RuleDetailsLink {
  href: string;
  onClick: (event: React.MouseEvent) => void;
}

/**
 * Builds the "View details" link synchronously, so the item is a link on first paint. Plain left
 * clicks navigate in-app; modified clicks use the href.
 */
export const getRuleDetailsLink = (
  rulesLocators: AlertingV2Locators['rulesLocators'],
  ruleId: string
): RuleDetailsLink => {
  const href = rulesLocators.getRedirectUrl({ ruleId });
  const { onClick } = getRouterLinkProps({
    href,
    onClick: () => rulesLocators.navigateSync({ ruleId }),
  });
  return { href, onClick };
};

export interface UseRuleMenuPanelsParams {
  rule: RuleApiResponse;
  /** Gates write actions (run, edit, clone, enable/disable, delete); read actions always show. */
  canWrite: boolean;
  onEdit: (rule: RuleApiResponse) => void;
  onClone: (rule: RuleApiResponse) => void;
  onDelete: (rule: RuleApiResponse) => void;
  onToggleEnabled?: (rule: RuleApiResponse) => void;
  onUpdateApiKey?: (rule: RuleApiResponse) => void;
  onRun?: (rule: RuleApiResponse) => void;
  /** When provided, adds a menu entry that opens change history for the rule. */
  onViewChangeHistory?: (rule: RuleApiResponse) => void;
  /** When provided, adds a leading "View details" read action linking to the rule details page. */
  detailsLink?: RuleDetailsLink;
  /** Called before an item's action runs. Omit it when the menu closes itself on item click. */
  closeMenu?: () => void;
}

/** Returns no panels when no action is available, so callers can hide the menu entirely. */
export const useRuleMenuPanels = ({
  rule,
  canWrite,
  onEdit,
  onClone,
  onDelete,
  onToggleEnabled,
  onUpdateApiKey,
  onRun,
  onViewChangeHistory,
  detailsLink,
  closeMenu,
}: UseRuleMenuPanelsParams): FlyoutFooterMenuPanel[] => {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
    const viewDetailsItem: FlyoutFooterMenuItem | null = detailsLink
      ? {
          key: 'viewDetails',
          name: i18n.translate('xpack.alertingV2.rulesList.action.viewDetails', {
            defaultMessage: 'View details',
          }),
          icon: 'eye',
          href: detailsLink.href,
          onClick: (event: React.MouseEvent) => {
            closeMenu?.();
            detailsLink.onClick(event);
          },
          'data-test-subj': `viewRuleDetails-${rule.id}`,
        }
      : null;

    const viewChangeHistoryItem: FlyoutFooterMenuItem | null = onViewChangeHistory
      ? {
          key: 'viewChangeHistory',
          name: i18n.translate('xpack.alertingV2.rulesList.action.viewChangeHistory', {
            defaultMessage: 'View change history',
          }),
          icon: 'clockCounter',
          onClick: () => {
            closeMenu?.();
            onViewChangeHistory(rule);
          },
          'data-test-subj': `viewChangeHistoryRule-${rule.id}`,
        }
      : null;

    const runItem: FlyoutFooterMenuItem | null =
      canWrite && onRun
        ? {
            key: 'run',
            name: i18n.translate('xpack.alertingV2.rulesList.action.run', {
              defaultMessage: 'Run',
            }),
            icon: 'play',
            disabled: !rule.enabled,
            toolTipContent: rule.enabled
              ? undefined
              : i18n.translate('xpack.alertingV2.rulesList.action.runDisabledTooltip', {
                  defaultMessage: 'Enable the rule to run it',
                }),
            onClick: () => {
              closeMenu?.();
              onRun(rule);
            },
            'data-test-subj': `runRule-${rule.id}`,
          }
        : null;

    const editItem: FlyoutFooterMenuItem | null = canWrite
      ? {
          key: 'edit',
          name: i18n.translate('xpack.alertingV2.rulesList.action.edit', {
            defaultMessage: 'Edit',
          }),
          icon: 'pencil',
          onClick: () => {
            closeMenu?.();
            onEdit(rule);
          },
          'data-test-subj': `editRule-${rule.id}`,
        }
      : null;

    const cloneItem: FlyoutFooterMenuItem | null = canWrite
      ? {
          key: 'clone',
          name: i18n.translate('xpack.alertingV2.rulesList.action.clone', {
            defaultMessage: 'Clone',
          }),
          icon: 'copy',
          onClick: () => {
            closeMenu?.();
            onClone(rule);
          },
          'data-test-subj': `cloneRule-${rule.id}`,
        }
      : null;

    const toggleEnabledItem: FlyoutFooterMenuItem | null =
      canWrite && onToggleEnabled
        ? {
            key: 'toggleEnabled',
            name: rule.enabled
              ? i18n.translate('xpack.alertingV2.rulesList.action.disable', {
                  defaultMessage: 'Disable',
                })
              : i18n.translate('xpack.alertingV2.rulesList.action.enable', {
                  defaultMessage: 'Enable',
                }),
            icon: rule.enabled ? 'bellSlash' : 'bell',
            onClick: () => {
              closeMenu?.();
              onToggleEnabled(rule);
            },
            'data-test-subj': `toggleEnabledRule-${rule.id}`,
          }
        : null;

    const updateApiKeyItem: FlyoutFooterMenuItem | null =
      canWrite && onUpdateApiKey
        ? {
            key: 'updateApiKey',
            name: i18n.translate('xpack.alertingV2.rulesList.action.updateApiKey', {
              defaultMessage: 'Update API key',
            }),
            icon: 'key',
            disabled: !rule.enabled,
            toolTipContent: rule.enabled
              ? undefined
              : i18n.translate('xpack.alertingV2.rulesList.action.updateApiKeyDisabledTooltip', {
                  defaultMessage: 'Enable the rule to update its API key',
                }),
            onClick: () => {
              closeMenu?.();
              onUpdateApiKey(rule);
            },
            'data-test-subj': `updateRuleApiKey-${rule.id}`,
          }
        : null;

    const deleteItem: FlyoutFooterMenuItem | null = canWrite
      ? {
          key: 'delete',
          name: i18n.translate('xpack.alertingV2.rulesList.action.delete', {
            defaultMessage: 'Delete',
          }),
          icon: <EuiIcon type="trash" size="m" color="danger" aria-hidden={true} />,
          css: css`
            color: ${euiTheme.colors.textDanger};
          `,
          onClick: () => {
            closeMenu?.();
            onDelete(rule);
          },
          'data-test-subj': `deleteRule-${rule.id}`,
        }
      : null;

    // Order: Run / Edit / Clone | View change history / Update API key | Delete.
    // View details links to the rule details page and leads the first group.
    // Enable/Disable sits with API key.
    const candidateGroups: Array<Array<FlyoutFooterMenuItem | null>> = [
      [viewDetailsItem, runItem, editItem, cloneItem],
      [viewChangeHistoryItem, toggleEnabledItem, updateApiKeyItem],
      [deleteItem],
    ];
    const groups = candidateGroups
      .map((group) => group.filter((item): item is FlyoutFooterMenuItem => item !== null))
      .filter((group) => group.length > 0);

    if (groups.length === 0) {
      return [];
    }

    const items = groups.flatMap((group, index): FlyoutFooterMenuItem[] =>
      index === 0 ? group : [{ isSeparator: true as const, key: `separator-${index}` }, ...group]
    );

    return [{ id: 0, items }];
  }, [
    rule,
    canWrite,
    onEdit,
    onClone,
    onDelete,
    onToggleEnabled,
    onUpdateApiKey,
    onRun,
    onViewChangeHistory,
    detailsLink,
    closeMenu,
    euiTheme.colors.textDanger,
  ]);
};
