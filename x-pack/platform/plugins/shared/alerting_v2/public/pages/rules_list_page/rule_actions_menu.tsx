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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RuleApiResponse } from '../../services/rules_api';

export interface RuleActionsMenuProps {
  rule: RuleApiResponse;
  onEdit: (rule: RuleApiResponse) => void;
  onClone: (rule: RuleApiResponse) => void;
  onDelete: (rule: RuleApiResponse) => void;
  onToggleEnabled: (rule: RuleApiResponse) => void;
}

export const RuleActionsMenu = ({
  rule,
  onEdit,
  onClone,
  onDelete,
  onToggleEnabled,
}: RuleActionsMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
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
    </EuiContextMenuItem>,
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
  ];

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          iconType="boxesHorizontal"
          aria-label={i18n.translate('xpack.alertingV2.rulesList.action.moreActions', {
            defaultMessage: 'More actions',
          })}
          color="text"
          onClick={() => setIsOpen((open) => !open)}
          data-test-subj={`ruleActionsButton-${rule.id}`}
        />
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downRight"
      aria-label={i18n.translate('xpack.alertingV2.rulesList.action.actionsMenu', {
        defaultMessage: 'Rule actions',
      })}
    >
      <EuiContextMenuPanel size="s" items={menuItems} />
    </EuiPopover>
  );
};
