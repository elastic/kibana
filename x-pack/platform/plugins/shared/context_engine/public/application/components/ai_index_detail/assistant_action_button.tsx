/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AiButton } from '@kbn/shared-ux-ai-components';
import React from 'react';
import type { AiIndexConversationState } from '../../../types';

interface AssistantActionButtonProps {
  conversation: AiIndexConversationState;
  onClick: () => void;
  /** Offered when this index has no conversation yet. */
  startLabel: string;
  /** Offered once a conversation exists. */
  continueLabel: string;
  /** Offered while the agent is still producing output. */
  workingLabel: string;
  'data-test-subj': string;
}

const WORKING_TOOLTIP = i18n.translate(
  'xpack.contextEngine.aiIndexDetail.assistantAction.workingTooltip',
  {
    defaultMessage:
      'The assistant is still working on this index. Opening it returns to that conversation.',
  }
);

/** The assistant entry point on an AI index panel. */
export const AssistantActionButton = ({
  conversation,
  onClick,
  startLabel,
  continueLabel,
  workingLabel,
  'data-test-subj': dataTestSubj,
}: AssistantActionButtonProps) => {
  const { conversationId, isRunning } = conversation;

  const button = (
    <AiButton size="s" iconType="productAgent" onClick={onClick} data-test-subj={dataTestSubj}>
      {isRunning ? workingLabel : conversationId ? continueLabel : startLabel}
    </AiButton>
  );

  // `AiButton` supports a tooltip only in its icon-only form.
  return isRunning ? <EuiToolTip content={WORKING_TOOLTIP}>{button}</EuiToolTip> : button;
};
