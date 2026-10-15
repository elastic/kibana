/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiPopover, EuiSelectable } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { ChatTriggerMode } from '../../../../../../common/http_api/chat';

const triggerModeLabels: Readonly<Record<ChatTriggerMode, string>> = {
  [ChatTriggerMode.Always]: i18n.translate(
    'xpack.agentBuilder.conversationInput.triggerModeSelector.includeAgent',
    { defaultMessage: 'Include agent' }
  ),
  [ChatTriggerMode.Never]: i18n.translate(
    'xpack.agentBuilder.conversationInput.triggerModeSelector.skipAgent',
    { defaultMessage: 'Skip agent' }
  ),
};

const selectorAriaLabel = i18n.translate(
  'xpack.agentBuilder.conversationInput.triggerModeSelector.ariaLabel',
  { defaultMessage: 'Include or skip the agent' }
);

const getButtonAriaLabel = (mode: string) =>
  i18n.translate('xpack.agentBuilder.conversationInput.triggerModeSelector.buttonAriaLabel', {
    defaultMessage: 'Include or skip the agent, {mode}',
    values: { mode },
  });

const panelStyles = css`
  inline-size: min-content;
`;

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
      panelPaddingSize="none"
      panelProps={{ css: panelStyles }}
      anchorPosition="upRight"
      button={
        <EuiButtonEmpty
          color="text"
          size="s"
          iconType="chevronSingleDown"
          iconSide="right"
          aria-label={getButtonAriaLabel(triggerModeLabels[triggerMode])}
          data-test-subj="agentBuilderTriggerModeSelectorButton"
          onClick={() => setIsPopoverOpen((isOpen) => !isOpen)}
        >
          {triggerModeLabels[triggerMode]}
        </EuiButtonEmpty>
      }
    >
      <EuiSelectable
        aria-label={selectorAriaLabel}
        data-test-subj="agentBuilderTriggerModeSelectorList"
        singleSelection="always"
        options={triggerModeOptions.map((mode) => ({
          key: mode,
          label: triggerModeLabels[mode],
          checked: mode === triggerMode ? 'on' : undefined,
          'data-test-subj': `agentBuilderTriggerModeOption-${mode}`,
        }))}
        listProps={{ isVirtualized: false, paddingSize: 's' }}
        onChange={(_options, _event, { key }) => {
          const mode = triggerModeOptions.find((option) => option === key);

          if (mode) {
            onTriggerModeChange(mode);
          }

          closePopover();
        }}
      >
        {(list) => list}
      </EuiSelectable>
    </EuiPopover>
  );
};
