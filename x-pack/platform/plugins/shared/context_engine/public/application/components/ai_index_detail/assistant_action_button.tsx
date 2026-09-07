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
  /** Offered once one exists, so the click reads as going back to it rather than starting over. */
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

/**
 * The assistant entry point on an AI index panel.
 *
 * A single conversation covers setting an index up and automating it, so the label has to say
 * whether pressing this starts one or returns to the one already going — otherwise a second press
 * looks like it lost the first.
 */
export const AssistantActionButton = ({
  conversation,
  onClick,
  startLabel,
  continueLabel,
  workingLabel,
  'data-test-subj': dataTestSubj,
}: AssistantActionButtonProps) => {
  const { conversationId, isRunning } = conversation;

  // Kept clickable while running: the run carries on after the sidebar is closed, and this is how
  // the user gets back to watching it.
  const button = (
    <AiButton size="s" iconType="productAgent" onClick={onClick} data-test-subj={dataTestSubj}>
      {isRunning ? workingLabel : conversationId ? continueLabel : startLabel}
    </AiButton>
  );

  // `AiButton`'s own tooltip prop is for its icon-only form, so the label variant is wrapped.
  return isRunning ? <EuiToolTip content={WORKING_TOOLTIP}>{button}</EuiToolTip> : button;
};
