/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import { useConversationStream } from '../../../../hooks/use_conversation_stream';

interface ConversationActionButtonProps {
  onSubmit: () => void;
  isSubmitDisabled: boolean;
  isSubmitting?: boolean;
  showSubmitWhileRunning?: boolean;
}

const labels = {
  cancel: i18n.translate('xpack.agentBuilder.conversationInput.actionButton.stop', {
    defaultMessage: 'Stop',
  }),
  submit: i18n.translate('xpack.agentBuilder.conversationInput.actionButton.submit', {
    defaultMessage: 'Submit',
  }),
};

export const ConversationActionButton: React.FC<ConversationActionButtonProps> = ({
  onSubmit,
  isSubmitDisabled,
  isSubmitting = false,
  showSubmitWhileRunning = false,
}) => {
  const { canCancel, cancel, isCancelling } = useConversationStream();
  const { euiTheme } = useEuiTheme();

  const cancelButtonStyles = css`
    background-color: ${euiTheme.colors.backgroundLightText};
  `;

  const submitButton = (
    <EuiToolTip content={labels.submit} disableScreenReaderOutput>
      <EuiButtonIcon
        aria-label={labels.submit}
        data-test-subj="agentBuilderConversationInputSubmitButton"
        iconType="sortUp"
        display="fill"
        size="s"
        disabled={isSubmitDisabled}
        isLoading={isSubmitting}
        onClick={onSubmit}
        {...getEbtProps({
          element: AGENT_BUILDER_UI_EBT.element.pageContent,
          action: AGENT_BUILDER_UI_EBT.action.conversation.SUBMIT,
          detail: 'conversation',
        })}
      />
    </EuiToolTip>
  );

  if (!canCancel) {
    return submitButton;
  }

  const cancelButton = (
    <EuiToolTip content={labels.cancel} disableScreenReaderOutput>
      <EuiButtonIcon
        aria-label={labels.cancel}
        data-test-subj="agentBuilderConversationInputCancelButton"
        iconType="stopFill"
        size="s"
        color="text"
        css={cancelButtonStyles}
        isLoading={isCancelling}
        disabled={isCancelling}
        onClick={cancel}
        {...getEbtProps({
          element: AGENT_BUILDER_UI_EBT.element.pageContent,
          action: AGENT_BUILDER_UI_EBT.action.conversation.CANCEL,
          detail: 'conversation',
        })}
      />
    </EuiToolTip>
  );

  return showSubmitWhileRunning ? (
    <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
      <EuiFlexItem grow={false}>{cancelButton}</EuiFlexItem>
      <EuiFlexItem grow={false}>{submitButton}</EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    cancelButton
  );
};
