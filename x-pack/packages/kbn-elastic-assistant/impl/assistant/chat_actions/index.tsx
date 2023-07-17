/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { css } from '@emotion/react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import * as i18n from '../translations';

interface OwnProps {
  isDisabled: boolean;
  isLoading: boolean;
  onChatCleared: () => void;
  onSendMessage: () => void;
}

type Props = OwnProps;

export const ChatActions: FunctionComponent<Props> = ({
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
        <EuiToolTip position="right" content={i18n.CLEAR_CHAT}>
          <EuiButtonIcon
            aria-label={i18n.CLEAR_CHAT}
            color="danger"
            display="base"
            iconType="cross"
            isDisabled={isDisabled}
            onClick={onChatCleared}
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip position="right" content={i18n.SUBMIT_MESSAGE}>
          <EuiButtonIcon
            aria-label={i18n.SUBMIT_MESSAGE}
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
