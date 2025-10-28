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

import type { Rule } from '../../../..';

export interface RuleActionsPopoverProps {
  rule: Rule;
  onDelete: (ruleId: string) => void;
  onApiKeyUpdate: (ruleId: string) => void;
  onEnableDisable: (enable: boolean) => void;
  onRunRule: (ruleId: string) => void;
  isInternallyManaged: boolean;
}

export const RuleActionsPopover: React.FunctionComponent<RuleActionsPopoverProps> = ({
  rule,
  onDelete,
  onApiKeyUpdate,
  onEnableDisable,
  onRunRule,
  isInternallyManaged,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const { euiTheme } = useEuiTheme();
  const ruleActionsPopover = css`
    .ruleActionsPopover__deleteButton {
      color: ${euiTheme.colors.textDanger};
    }
  `;

  const getDisableEnablePanelItem = (testId: string) => ({
    'data-test-subj': testId,
    onClick: async () => {
      setIsPopoverOpen(false);
      onEnableDisable(!rule.enabled);
    },
    name: !rule.enabled
      ? i18n.translate('xpack.triggersActionsUI.sections.ruleDetails.enableRuleButtonLabel', {
          defaultMessage: 'Enable',
        })
      : i18n.translate('xpack.triggersActionsUI.sections.ruleDetails.disableRuleButtonLabel', {
          defaultMessage: 'Disable',
        }),
  });

  const getUpdateApiKeyPanelItem = (testId: string) => {
    return {
      'data-test-subj': testId,
      onClick: () => {
        setIsPopoverOpen(false);
        onApiKeyUpdate(rule.id);
      },
      name: i18n.translate('xpack.triggersActionsUI.sections.ruleDetails.updateAPIKeyButtonLabel', {
        defaultMessage: 'Update API key',
      }),
    };
  };

  return (
    <EuiPopover
      button={
        <EuiButtonEmpty
          disabled={false}
          data-test-subj="ruleActionsButton"
          data-testid="ruleActionsButton"
          iconType="boxesHorizontal"
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          aria-label={i18n.translate(
            'xpack.triggersActionsUI.sections.ruleDetails.popoverButtonTitle',
            { defaultMessage: 'Actions' }
          )}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      ownFocus
      panelPaddingSize="none"
    >
      <EuiContextMenu
        initialPanelId={0}
        panels={[
          {
            id: 0,
            items: isInternallyManaged
              ? [
                  getDisableEnablePanelItem('disableButtonInternallyManaged'),
                  getUpdateApiKeyPanelItem('updateAPIKeyButtonInternallyManaged'),
                ]
              : [
                  getDisableEnablePanelItem('disableButton'),
                  getUpdateApiKeyPanelItem('updateAPIKeyButton'),
                  {
                    'data-test-subj': 'runRuleButton',
                    onClick: () => {
                      setIsPopoverOpen(false);
                      onRunRule(rule.id);
                    },
                    name: i18n.translate(
                      'xpack.triggersActionsUI.sections.ruleDetails.runRuleButtonLabel',
                      { defaultMessage: 'Run rule' }
                    ),
                  },
                  {
                    className: 'ruleActionsPopover__deleteButton',
                    'data-test-subj': 'deleteRuleButton',
                    onClick: () => {
                      setIsPopoverOpen(false);
                      onDelete(rule.id);
                    },
                    name: i18n.translate(
                      'xpack.triggersActionsUI.sections.ruleDetails.deleteRuleButtonLabel',
                      { defaultMessage: 'Delete rule' }
                    ),
                  },
                ],
          },
        ]}
        className="ruleActionsPopover"
        data-test-subj="ruleActionsPopover"
        data-testid="ruleActionsPopover"
        css={ruleActionsPopover}
      />
    </EuiPopover>
  );
};
