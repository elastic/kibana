/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { EuiButtonIcon, EuiContextMenu, EuiPopover, EuiToolTip } from '@elastic/eui';
import { useToggleRuleEnabled } from '../../hooks/use_toggle_rule_enabled';
import { useRule } from './rule_context';

export interface RuleDetailsActionsMenuProps {
  showDeleteConfirmation: () => void;
  onClone: () => void;
}

export const RuleDetailsActionsMenu: React.FunctionComponent<RuleDetailsActionsMenuProps> = ({
  showDeleteConfirmation,
  onClone,
}) => {
  const rule = useRule();
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const { mutate: toggleRuleEnabled } = useToggleRuleEnabled();

  const handleToggleEnable = () => {
    setIsPopoverOpen(false);
    toggleRuleEnabled({
      id: rule.id,
      enabled: !rule.enabled,
    });
  };

  const handleClone = () => {
    setIsPopoverOpen(false);
    onClone();
  };

  const handleDelete = () => {
    setIsPopoverOpen(false);
    showDeleteConfirmation();
  };

  const panels = [
    {
      id: 0,
      items: [
        ...(rule.enabled
          ? [
              {
                'data-test-subj': 'ruleDetailsDisableButton',
                onClick: handleToggleEnable,
                name: i18n.translate('xpack.alertingV2.ruleDetails.disableRuleButtonLabel', {
                  defaultMessage: 'Disable rule',
                }),
              },
            ]
          : [
              {
                'data-test-subj': 'ruleDetailsEnableButton',
                onClick: handleToggleEnable,
                name: i18n.translate('xpack.alertingV2.ruleDetails.enableRuleButtonLabel', {
                  defaultMessage: 'Enable rule',
                }),
              },
            ]),
        {
          'data-test-subj': 'ruleDetailsCloneButton',
          onClick: handleClone,
          name: i18n.translate('xpack.alertingV2.ruleDetails.cloneRuleButtonLabel', {
            defaultMessage: 'Clone rule',
          }),
        },
        {
          className: 'ruleDetailsActionsMenu__deleteButton',
          'data-test-subj': 'ruleDetailsDeleteButton',
          onClick: handleDelete,
          name: i18n.translate('xpack.alertingV2.ruleDetails.deleteRuleButtonLabel', {
            defaultMessage: 'Delete rule',
          }),
        },
      ],
    },
  ];

  return (
    <EuiPopover
      aria-label={i18n.translate('xpack.alertingV2.ruleDetails.actionsMenuPopoverAriaLabel', {
        defaultMessage: 'Rule actions',
      })}
      button={
        <EuiToolTip
          content={i18n.translate('xpack.alertingV2.ruleDetails.actionsMenuAriaLabel', {
            defaultMessage: 'Actions',
          })}
          disableScreenReaderOutput
        >
          <EuiButtonIcon
            data-test-subj="ruleDetailsActionsButton"
            iconType="boxesHorizontal"
            color="text"
            size="m"
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
            aria-label={i18n.translate('xpack.alertingV2.ruleDetails.actionsMenuAriaLabel', {
              defaultMessage: 'Actions',
            })}
          />
        </EuiToolTip>
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      ownFocus
      panelPaddingSize="none"
    >
      <EuiContextMenu
        initialPanelId={0}
        panels={panels}
        className="ruleDetailsActionsMenu"
        data-test-subj="ruleDetailsActionsMenu"
      />
    </EuiPopover>
  );
};
