/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { EuiButtonEmpty, EuiContextMenu, EuiPopover, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { RuleApiResponse } from '../../services/rules_api';
import { useCloneRule } from '../../hooks/use_clone_rule';
import { useDisableRule } from '../../hooks/use_disable_rule';
import { useEnableRule } from '../../hooks/use_enable_rule';

export interface RuleDetailsActionsMenuProps {
  rule: RuleApiResponse;
  showDeleteConfirmation: () => void;
}

export const RuleDetailsActionsMenu: React.FunctionComponent<RuleDetailsActionsMenuProps> = ({
  rule,
  showDeleteConfirmation,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const { euiTheme } = useEuiTheme();
  const { mutate: cloneRule } = useCloneRule();
  const { mutate: disableRule } = useDisableRule();
  const { mutate: enableRule } = useEnableRule();

  const deleteButtonStyles = css`
    .ruleDetailsActionsMenu__deleteButton {
      color: ${euiTheme.colors.textDanger};
    }
  `;

  const handleDisable = () => {
    setIsPopoverOpen(false);
    disableRule({ id: rule.id });
  };

  const handleEnable = () => {
    setIsPopoverOpen(false);
    enableRule({ id: rule.id });
  };

  const handleClone = () => {
    setIsPopoverOpen(false);
    cloneRule(rule);
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
                onClick: handleDisable,
                name: i18n.translate('xpack.alertingV2.ruleDetails.disableRuleButtonLabel', {
                  defaultMessage: 'Disable rule',
                }),
              },
            ]
          : [
              {
                'data-test-subj': 'ruleDetailsEnableButton',
                onClick: handleEnable,
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
      button={
        <EuiButtonEmpty
          data-test-subj="ruleDetailsActionsButton"
          iconType="boxesHorizontal"
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          aria-label={i18n.translate('xpack.alertingV2.ruleDetails.actionsMenuAriaLabel', {
            defaultMessage: 'Actions',
          })}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      ownFocus
      panelPaddingSize="none"
      css={deleteButtonStyles}
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
