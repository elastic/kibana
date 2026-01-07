/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlyout, EuiFlyoutHeader, EuiTitle, EuiFlyoutBody, EuiCodeBlock } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';
import type { ConversationRound } from '@kbn/agent-builder-common';
import { css } from '@emotion/react';

const rawResponseFlyoutTitle = i18n.translate(
  'xpack.agentBuilder.conversation.rawResponseFlyout.title',
  {
    defaultMessage: 'Raw response',
  }
);

interface RawResponseFlyoutProps {
  isOpen: boolean;
  onClose: () => void;
  rawRound: ConversationRound;
}

export const RoundFlyout: React.FC<RawResponseFlyoutProps> = ({ isOpen, onClose, rawRound }) => {
  if (!isOpen) return null;

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby="rawResponseFlyoutTitle"
      size="m"
      ownFocus={false}
      css={css`
        z-index: ${euiThemeVars.euiZFlyout + 4};
      `}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="rawResponseFlyoutTitle">{rawResponseFlyoutTitle}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiCodeBlock
          language="json"
          fontSize="s"
          paddingSize="m"
          isCopyable={true}
          css={css`
            overflow: auto;
          `}
        >
          {JSON.stringify(rawRound, null, 2)}
        </EuiCodeBlock>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
