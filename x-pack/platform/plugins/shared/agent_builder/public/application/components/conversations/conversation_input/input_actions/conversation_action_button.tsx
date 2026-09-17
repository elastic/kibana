/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { distinctUntilChanged, map, of } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { EuiButtonIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import { useConversationStream } from '../../../../hooks/use_conversation_stream';
import { useConversationId } from '../../../../context/conversation/use_conversation_id';
import { useConversationStreamService } from '../../../../context/streaming/streaming_context';

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
  const conversationId = useConversationId();
  const conversationStreamService = useConversationStreamService();
  // Stop button is enabled once the server has persisted the user_message_event.
  const hasStarted$ = useMemo(
    () =>
      conversationId
        ? conversationStreamService.getActiveStream$(conversationId).pipe(
            map((draft) => Boolean(draft?.executionId)),
            distinctUntilChanged()
          )
        : of(false),
    [conversationStreamService, conversationId]
  );
  const hasStarted = useObservable(hasStarted$, false);

  const cancelButtonStyles = css`
    background-color: ${euiTheme.colors.backgroundLightText};
  `;

  return canCancel ? (
    <EuiToolTip content={labels.cancel} disableScreenReaderOutput>
      <EuiButtonIcon
        aria-label={labels.cancel}
        data-test-subj="agentBuilderConversationInputCancelButton"
        iconType="stopFill"
        size="s"
        color="text"
        css={cancelButtonStyles}
        isDisabled={!hasStarted}
        onClick={() => {
          cancel();
          resetToPendingMessage();
        }}
        {...getEbtProps({
          element: AGENT_BUILDER_UI_EBT.element.pageContent,
          action: AGENT_BUILDER_UI_EBT.action.conversation.CANCEL,
          detail: 'conversation',
        })}
      />
    </EuiToolTip>
  ) : (
    <EuiToolTip content={labels.submit} disableScreenReaderOutput>
      <EuiButtonIcon
        aria-label={labels.submit}
        data-test-subj="agentBuilderConversationInputSubmitButton"
        iconType="sortUp"
        display="fill"
        size="s"
        disabled={isSubmitDisabled}
        onClick={onSubmit}
        {...getEbtProps({
          element: AGENT_BUILDER_UI_EBT.element.pageContent,
          action: AGENT_BUILDER_UI_EBT.action.conversation.SUBMIT,
          detail: 'conversation',
        })}
      />
    </EuiToolTip>
  );
};
