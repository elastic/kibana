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

export interface RuleTemplateActionsMenuProps {
  templateId: string;
  disabled?: boolean;
  onInstall: () => void;
  onCreate: () => void;
}

export const RuleTemplateActionsMenu = ({
  templateId,
  disabled = false,
  onInstall,
  onCreate,
}: RuleTemplateActionsMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    <EuiContextMenuItem
      key="install"
      icon={<EuiIcon type="importAction" size="m" aria-hidden={true} />}
      disabled={disabled}
      onClick={() => {
        setIsOpen(false);
        onInstall();
      }}
      data-test-subj={`installRuleTemplate-${templateId}`}
    >
      {i18n.translate('xpack.alertingV2.ruleLibrary.action.install', {
        defaultMessage: 'Install',
      })}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="create"
      icon={<EuiIcon type="plusInCircle" size="m" aria-hidden={true} />}
      disabled={disabled}
      onClick={() => {
        setIsOpen(false);
        onCreate();
      }}
      data-test-subj={`createRuleTemplate-${templateId}`}
    >
      {i18n.translate('xpack.alertingV2.ruleLibrary.action.create', {
        defaultMessage: 'Create',
      })}
    </EuiContextMenuItem>,
  ];

  return (
    <EuiPopover
      button={
        <EuiToolTip
          content={i18n.translate('xpack.alertingV2.ruleLibrary.action.moreActions', {
            defaultMessage: 'More actions',
          })}
          disableScreenReaderOutput
        >
          <EuiButtonIcon
            iconType="boxesHorizontal"
            aria-label={i18n.translate('xpack.alertingV2.ruleLibrary.action.moreActions', {
              defaultMessage: 'More actions',
            })}
            color="text"
            disabled={disabled}
            onClick={() => setIsOpen((open) => !open)}
            data-test-subj={`ruleTemplateActionsButton-${templateId}`}
          />
        </EuiToolTip>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downRight"
      aria-label={i18n.translate('xpack.alertingV2.ruleLibrary.action.actionsMenu', {
        defaultMessage: 'Rule template actions',
      })}
    >
      <EuiContextMenuPanel items={menuItems} />
    </EuiPopover>
  );
};
