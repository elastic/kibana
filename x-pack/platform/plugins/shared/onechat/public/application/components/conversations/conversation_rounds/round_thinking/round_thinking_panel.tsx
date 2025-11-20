/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiButton } from '@elastic/eui';
import React, { useState } from 'react';
import type { ConversationRound, ConversationRoundStep } from '@kbn/onechat-common';
import { i18n } from '@kbn/i18n';
import { RoundFlyout } from '../round_flyout';
import { RoundSteps } from './steps/round_steps';
import { ThinkingTimeDisplay } from './thinking_time_display';

const rawResponseButtonLabel = i18n.translate('xpack.onechat.conversation.rawResponseButton', {
  defaultMessage: 'View raw response',
});

interface RoundThinkingPanelProps {
  steps: ConversationRoundStep[];
  isLoading: boolean;
  rawRound: ConversationRound;
  onClose: () => void;
}

export const RoundThinkingPanel = ({
  steps,
  isLoading,
  rawRound,
  onClose,
}: RoundThinkingPanelProps) => {
  const [showFlyout, setShowFlyout] = useState(false);

  const toggleFlyout = () => {
    setShowFlyout(!showFlyout);
  };

  return (
    <>
      <EuiPanel paddingSize="l" hasShadow={false} hasBorder={false} color="subdued">
        <RoundSteps steps={steps} />
        {!isLoading && (
          <EuiButton iconType={'code'} color="primary" iconSide="left" onClick={toggleFlyout}>
            {rawResponseButtonLabel}
          </EuiButton>
        )}
        <ThinkingTimeDisplay timeToFirstToken={rawRound.time_to_first_token} />
      </EuiPanel>
      <RoundFlyout isOpen={showFlyout} onClose={toggleFlyout} rawRound={rawRound} />
    </>
  );
};
