/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { CLEAR_CHAT, SUBMIT_MESSAGE } from '../translations';

interface OwnProps {
  isDisabled: boolean;
  isLoading: boolean;
  onChatCleared: () => void;
  onSendMessage: () => void;
}

type Props = OwnProps;
/**
 * Renders two EuiButtonIcon components with tooltips for clearing the chat and submitting a message,
 * while handling the disabled and loading states of the buttons.
 */
export const ChatActions: React.FC<Props> = ({
  isDisabled,
  isLoading,
  onChatCleared,
  onSendMessage,
}) => {
  return (
    <EuiFlexGroup
      css={css`
        position: absolute;
      `}
      direction="column"
      gutterSize="xs"
    >
      <EuiFlexItem grow={false}>
        <EuiToolTip position="right" content={CLEAR_CHAT}>
          <EuiButtonIcon
            aria-label={CLEAR_CHAT}
            color="danger"
            data-test-subj="clear-chat"
            display="base"
            iconType="cross"
            isDisabled={isDisabled}
            onClick={onChatCleared}
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip position="right" content={SUBMIT_MESSAGE}>
          <EuiButtonIcon
            aria-label={SUBMIT_MESSAGE}
            data-test-subj="submit-chat"
            color="primary"
            display="base"
            iconType="returnKey"
            isDisabled={isDisabled}
            isLoading={isLoading}
            onClick={onSendMessage}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
