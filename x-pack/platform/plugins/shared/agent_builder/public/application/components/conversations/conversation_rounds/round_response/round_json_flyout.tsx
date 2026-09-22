/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCodeBlock, EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
import type { ConversationRound } from '@kbn/agent-builder-common';

const title = i18n.translate('xpack.agentBuilder.round.jsonFlyout.title', {
  defaultMessage: 'Raw response',
});

interface RoundJsonFlyoutProps {
  rawRound: ConversationRound;
  onClose: () => void;
}

export const RoundJsonFlyout: React.FC<RoundJsonFlyoutProps> = ({ rawRound, onClose }) => {
  const formattedJson = useMemo(() => JSON.stringify(rawRound, null, 2), [rawRound]);

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby="agentBuilderRoundJsonFlyoutTitle"
      size="m"
      ownFocus={false}
      css={css`
        z-index: ${euiThemeVars.euiZFlyout + 4};
      `}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="agentBuilderRoundJsonFlyoutTitle">{title}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiCodeBlock
          language="json"
          fontSize="s"
          paddingSize="m"
          isCopyable
          css={css`
            overflow: auto;
          `}
        >
          {formattedJson}
        </EuiCodeBlock>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
