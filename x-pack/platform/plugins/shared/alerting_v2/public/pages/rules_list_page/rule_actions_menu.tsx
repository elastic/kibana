/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiPopoverProps } from '@elastic/eui';
import React, { useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiHorizontalRule,
  EuiIcon,
  EuiPopover,
  EuiTextColor,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RuleApiResponse } from '../../services/rules_api';

export interface RuleActionsMenuProps {
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
  detailsHref?: string;
  /**
   * Renders the popover trigger. Defaults to the kebab "More actions" icon button used in the
   * rules list. The flyout footer passes a "Take action" button instead.
   */
  renderButton?: (args: { isOpen: boolean; toggle: () => void }) => React.ReactElement;
  anchorPosition?: EuiPopoverProps['anchorPosition'];
}

export const RuleActionsMenu = ({
  rule,
  canWrite,
  onEdit,
  onClone,
  onDelete,
  onToggleEnabled,
  onUpdateApiKey,
  onRun,
  onViewChangeHistory,
  detailsHref,
  renderButton,
  anchorPosition = 'downRight',
}: RuleActionsMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Each action is built once and then arranged into separated groups below. `null` entries
  // (unavailable or write-gated actions) are filtered out before rendering.
  const viewDetailsItem = detailsHref ? (
    <EuiContextMenuItem
      key="viewDetails"
      icon={<EuiIcon type="eye" size="m" aria-hidden={true} />}
      href={detailsHref}
      onClick={() => setIsOpen(false)}
      data-test-subj={`viewRuleDetails-${rule.id}`}
    >
      {i18n.translate('xpack.alertingV2.rulesList.action.viewDetails', {
        defaultMessage: 'View details',
      })}
    </EuiContextMenuItem>
  ) : null;

  const viewChangeHistoryItem = onViewChangeHistory ? (
    <EuiContextMenuItem
      key="viewChangeHistory"
      icon={<EuiIcon type="clockCounter" size="m" aria-hidden={true} />}
      onClick={() => {
        setIsOpen(false);
        onViewChangeHistory(rule);
      }}
      data-test-subj={`viewChangeHistoryRule-${rule.id}`}
    >
      {i18n.translate('xpack.alertingV2.rulesList.action.viewChangeHistory', {
        defaultMessage: 'View change history',
      })}
    </EuiContextMenuItem>
  ) : null;

  const runItem =
    canWrite && onRun ? (
      <EuiContextMenuItem
        key="run"
        icon={<EuiIcon type="play" size="m" aria-hidden={true} />}
        disabled={!rule.enabled}
        toolTipContent={
          rule.enabled
            ? undefined
            : i18n.translate('xpack.alertingV2.rulesList.action.runDisabledTooltip', {
                defaultMessage: 'Enable the rule to run it',
              })
        }
        onClick={() => {
          setIsOpen(false);
          onRun(rule);
        }}
        data-test-subj={`runRule-${rule.id}`}
      >
        {i18n.translate('xpack.alertingV2.rulesList.action.run', {
          defaultMessage: 'Run',
        })}
      </EuiContextMenuItem>
    ) : null;

  const editItem = canWrite ? (
    <EuiContextMenuItem
      key="edit"
      icon={<EuiIcon type="pencil" size="m" aria-hidden={true} />}
      onClick={() => {
        setIsOpen(false);
        onEdit(rule);
      }}
      data-test-subj={`editRule-${rule.id}`}
    >
      {i18n.translate('xpack.alertingV2.rulesList.action.edit', {
        defaultMessage: 'Edit',
      })}
    </EuiContextMenuItem>
  ) : null;

  const cloneItem = canWrite ? (
    <EuiContextMenuItem
      key="clone"
      icon={<EuiIcon type="copy" size="m" aria-hidden={true} />}
      onClick={() => {
        setIsOpen(false);
        onClone(rule);
      }}
      data-test-subj={`cloneRule-${rule.id}`}
    >
      {i18n.translate('xpack.alertingV2.rulesList.action.clone', {
        defaultMessage: 'Clone',
      })}
    </EuiContextMenuItem>
  ) : null;

  const toggleEnabledItem =
    canWrite && onToggleEnabled ? (
      <EuiContextMenuItem
        key="toggleEnabled"
        icon={<EuiIcon type={rule.enabled ? 'bellSlash' : 'bell'} size="m" aria-hidden={true} />}
        onClick={() => {
          setIsOpen(false);
          onToggleEnabled(rule);
        }}
        data-test-subj={`toggleEnabledRule-${rule.id}`}
      >
        {rule.enabled
          ? i18n.translate('xpack.alertingV2.rulesList.action.disable', {
              defaultMessage: 'Disable',
            })
          : i18n.translate('xpack.alertingV2.rulesList.action.enable', {
              defaultMessage: 'Enable',
            })}
      </EuiContextMenuItem>
    ) : null;

  const updateApiKeyItem =
    canWrite && onUpdateApiKey ? (
      <EuiContextMenuItem
        key="updateApiKey"
        icon={<EuiIcon type="key" size="m" aria-hidden={true} />}
        disabled={!rule.enabled}
        toolTipContent={
          rule.enabled
            ? undefined
            : i18n.translate('xpack.alertingV2.rulesList.action.updateApiKeyDisabledTooltip', {
                defaultMessage: 'Enable the rule to update its API key',
              })
        }
        onClick={() => {
          setIsOpen(false);
          onUpdateApiKey(rule);
        }}
        data-test-subj={`updateRuleApiKey-${rule.id}`}
      >
        {i18n.translate('xpack.alertingV2.rulesList.action.updateApiKey', {
          defaultMessage: 'Update API key',
        })}
      </EuiContextMenuItem>
    ) : null;

  const deleteItem = canWrite ? (
    <EuiContextMenuItem
      key="delete"
      icon={<EuiIcon type="trash" size="m" color="danger" aria-hidden={true} />}
      onClick={() => {
        setIsOpen(false);
        onDelete(rule);
      }}
      data-test-subj={`deleteRule-${rule.id}`}
    >
      <EuiTextColor color="danger">
        {i18n.translate('xpack.alertingV2.rulesList.action.delete', {
          defaultMessage: 'Delete',
        })}
      </EuiTextColor>
    </EuiContextMenuItem>
  ) : null;

  const isItem = (item: React.ReactElement | null): item is React.ReactElement => item !== null;

  // Actions are separated into visual groups (read / edit-clone / run-disable-apiKey / delete);
  // empty groups (e.g. write groups for read-only users) are dropped before rendering.
  const groups = [
    [viewDetailsItem, viewChangeHistoryItem],
    [editItem, cloneItem],
    [runItem, toggleEnabledItem, updateApiKeyItem],
    [deleteItem],
  ]
    .map((group) => group.filter(isItem))
    .filter((group) => group.length > 0);

  const menuItems = groups.flatMap((group, index) =>
    index === 0 ? group : [<EuiHorizontalRule key={`separator-${index}`} margin="none" />, ...group]
  );

  if (menuItems.length === 0) {
    return null;
  }

  const toggle = () => setIsOpen((open) => !open);

  const button = renderButton ? (
    renderButton({ isOpen, toggle })
  ) : (
    <EuiToolTip
      content={i18n.translate('xpack.alertingV2.rulesList.action.moreActions', {
        defaultMessage: 'More actions',
      })}
      disableScreenReaderOutput
    >
      <EuiButtonIcon
        iconType="ellipsis"
        aria-label={i18n.translate('xpack.alertingV2.rulesList.action.moreActions', {
          defaultMessage: 'More actions',
        })}
        color="text"
        onClick={toggle}
        data-test-subj={`ruleActionsButton-${rule.id}`}
      />
    </EuiToolTip>
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition={anchorPosition}
      aria-label={i18n.translate('xpack.alertingV2.rulesList.action.actionsMenu', {
        defaultMessage: 'Rule actions',
      })}
    >
      <EuiContextMenuPanel items={menuItems} />
    </EuiPopover>
  );
};
