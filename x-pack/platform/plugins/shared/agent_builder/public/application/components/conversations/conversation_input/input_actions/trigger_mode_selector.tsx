/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiListGroup, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { ChatTriggerMode } from '../../../../../../common/http_api/chat';

const triggerModeLabels: Readonly<Record<ChatTriggerMode, string>> = {
  [ChatTriggerMode.Always]: i18n.translate(
    'xpack.agentBuilder.conversationInput.triggerModeSelector.agentAndUsers',
    { defaultMessage: 'Talk to agent and users' }
  ),
  [ChatTriggerMode.Never]: i18n.translate(
    'xpack.agentBuilder.conversationInput.triggerModeSelector.usersOnly',
    { defaultMessage: 'Talk to users' }
  ),
};

const selectorAriaLabel = i18n.translate(
  'xpack.agentBuilder.conversationInput.triggerModeSelector.ariaLabel',
  { defaultMessage: 'Choose who to talk to' }
);

const triggerModeOptions = [ChatTriggerMode.Always, ChatTriggerMode.Never] as const;

interface TriggerModeSelectorProps {
  triggerMode: ChatTriggerMode;
  onTriggerModeChange: (mode: ChatTriggerMode) => void;
}

export const TriggerModeSelector: React.FC<TriggerModeSelectorProps> = ({
  triggerMode,
  onTriggerModeChange,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const closePopover = () => setIsPopoverOpen(false);

  return (
    <EuiPopover
      aria-label={selectorAriaLabel}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="s"
      anchorPosition="upRight"
      button={
        <EuiButtonEmpty
          color="text"
          size="s"
          iconType="chevronSingleDown"
          iconSide="right"
          data-test-subj="agentBuilderTriggerModeSelectorButton"
          onClick={() => setIsPopoverOpen((isOpen) => !isOpen)}
        >
          {triggerModeLabels[triggerMode]}
        </EuiButtonEmpty>
      }
    >
      <EuiListGroup
        color="text"
        data-test-subj="agentBuilderTriggerModeSelectorList"
        listItems={triggerModeOptions.map((mode) => ({
          label: triggerModeLabels[mode],
          size: 's',
          isActive: mode === triggerMode,
          'data-test-subj': `agentBuilderTriggerModeOption-${mode}`,
          onClick: () => {
            onTriggerModeChange(mode);
            closePopover();
          },
        }))}
      />
    </EuiPopover>
  );
};
