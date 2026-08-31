/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiIcon,
  EuiPopover,
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
}: RuleActionsMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const viewChangeHistoryItems = onViewChangeHistory
    ? [
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
        </EuiContextMenuItem>,
      ]
    : [];

  const menuItems = [
    ...(canWrite
      ? [
          // Run
          ...(onRun
            ? [
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
                </EuiContextMenuItem>,
              ]
            : []),
          // Edit
          <EuiContextMenuItem
            key="edit"
            icon={<EuiIcon type="pencil" size="m" aria-hidden={true} />}
            onClick={() => {
              setIsOpen(false);
              onEdit(rule);
            }}
            data-test-subj={`editRule-${rule.id}`}
          >
            {i18n.translate('xpack.alertingV2.rulesList.action.edit', { defaultMessage: 'Edit' })}
          </EuiContextMenuItem>,
          // Clone
          <EuiContextMenuItem
            key="clone"
            icon={<EuiIcon type="copy" size="m" aria-hidden={true} />}
            onClick={() => {
              setIsOpen(false);
              onClone(rule);
            }}
            data-test-subj={`cloneRule-${rule.id}`}
          >
            {i18n.translate('xpack.alertingV2.rulesList.action.clone', { defaultMessage: 'Clone' })}
          </EuiContextMenuItem>,
          // View change history
          ...viewChangeHistoryItems,
          // Enable/disable
          ...(onToggleEnabled
            ? [
                <EuiContextMenuItem
                  key="toggleEnabled"
                  icon={
                    <EuiIcon
                      type={rule.enabled ? 'bellSlash' : 'bell'}
                      size="m"
                      aria-hidden={true}
                    />
                  }
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
                </EuiContextMenuItem>,
              ]
            : []),
          // Update API key
          ...(onUpdateApiKey
            ? [
                <EuiContextMenuItem
                  key="updateApiKey"
                  icon={<EuiIcon type="key" size="m" aria-hidden={true} />}
                  disabled={!rule.enabled}
                  toolTipContent={
                    rule.enabled
                      ? undefined
                      : i18n.translate(
                          'xpack.alertingV2.rulesList.action.updateApiKeyDisabledTooltip',
                          {
                            defaultMessage: 'Enable the rule to update its API key',
                          }
                        )
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
                </EuiContextMenuItem>,
              ]
            : []),
          // Delete
          <EuiContextMenuItem
            key="delete"
            icon={<EuiIcon type="trash" size="m" color="danger" aria-hidden={true} />}
            onClick={() => {
              setIsOpen(false);
              onDelete(rule);
            }}
            data-test-subj={`deleteRule-${rule.id}`}
          >
            {i18n.translate('xpack.alertingV2.rulesList.action.delete', {
              defaultMessage: 'Delete',
            })}
          </EuiContextMenuItem>,
        ]
      : [
          // View change history
          ...viewChangeHistoryItems,
        ]),
  ];

  if (menuItems.length === 0) {
    return null;
  }

  return (
    <EuiPopover
      button={
        <EuiToolTip
          content={i18n.translate('xpack.alertingV2.rulesList.action.moreActions', {
            defaultMessage: 'More actions',
          })}
          disableScreenReaderOutput
        >
          <EuiButtonIcon
            iconType="boxesVertical"
            aria-label={i18n.translate('xpack.alertingV2.rulesList.action.moreActions', {
              defaultMessage: 'More actions',
            })}
            color="text"
            onClick={() => setIsOpen((open) => !open)}
            data-test-subj={`ruleActionsButton-${rule.id}`}
          />
        </EuiToolTip>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downRight"
      aria-label={i18n.translate('xpack.alertingV2.rulesList.action.actionsMenu', {
        defaultMessage: 'Rule actions',
      })}
    >
      <EuiContextMenuPanel items={menuItems} />
    </EuiPopover>
  );
};
