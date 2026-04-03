/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { EuiButtonEmpty, EuiContextMenu, EuiPopover } from '@elastic/eui';
import { CoreStart, useService } from '@kbn/core-di-browser';
import type { RuleApiResponse } from '../../services/rules_api';
import { paths } from '../../constants';
import { useToggleRuleEnabled } from '../../hooks/use_toggle_rule_enabled';

export interface RuleDetailsActionsMenuProps {
  rule: RuleApiResponse;
  showDeleteConfirmation: () => void;
}

export const RuleDetailsActionsMenu: React.FunctionComponent<RuleDetailsActionsMenuProps> = ({
  rule,
  showDeleteConfirmation,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const { navigateToUrl } = useService(CoreStart('application'));
  const { basePath } = useService(CoreStart('http'));
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
    navigateToUrl(basePath.prepend(`${paths.ruleCreate}?cloneFrom=${encodeURIComponent(rule.id)}`));
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
