/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useConversationStream } from '../../../../hooks/use_conversation_stream';

interface ConversationActionButtonProps {
  onSubmit: () => void;
  isSubmitDisabled: boolean;
  resetToPendingMessage: () => void;
}

const labels = {
  cancel: i18n.translate('xpack.agentBuilder.conversationInput.actionButton.cancel', {
    defaultMessage: 'Cancel',
  }),
  submit: i18n.translate('xpack.agentBuilder.conversationInput.actionButton.submit', {
    defaultMessage: 'Submit',
  }),
};

export const ConversationActionButton: React.FC<ConversationActionButtonProps> = ({
  onSubmit,
  isSubmitDisabled,
  resetToPendingMessage,
}) => {
  const { canCancel, cancel } = useConversationStream();
  const { euiTheme } = useEuiTheme();

  const cancelButtonStyles = css`
    background-color: ${euiTheme.colors.backgroundLightText};
  `;

  return canCancel ? (
    <EuiButtonIcon
      aria-label={labels.cancel}
      data-test-subj="agentBuilderConversationInputCancelButton"
      iconType="stopFill"
      size="s"
      color="text"
      css={cancelButtonStyles}
      onClick={() => {
        if (canCancel) {
          cancel();
          resetToPendingMessage();
        }
      }}
    />
  ) : (
    <EuiButtonIcon
      aria-label={labels.submit}
      data-test-subj="agentBuilderConversationInputSubmitButton"
      iconType="sortUp"
      display="fill"
      size="s"
      disabled={isSubmitDisabled}
      onClick={onSubmit}
    />
  );
};
