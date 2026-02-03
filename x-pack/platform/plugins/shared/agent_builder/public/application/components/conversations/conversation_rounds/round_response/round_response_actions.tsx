/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import copy from 'copy-to-clipboard';
import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { useToasts } from '../../../../hooks/use_toasts';
import { useSendMessage } from '../../../../context/send_message/send_message_context';

const labels = {
  copy: i18n.translate('xpack.agentBuilder.roundResponseActions.copy', {
    defaultMessage: 'Copy response',
  }),
  copySuccess: i18n.translate('xpack.agentBuilder.roundResponseActions.copySuccess', {
    defaultMessage: 'Response copied to clipboard',
  }),
  resend: i18n.translate('xpack.agentBuilder.roundResponseActions.resend', {
    defaultMessage: 'Resend response',
  }),
};

interface RoundResponseActionsProps {
  content: string;
  isVisible: boolean;
  isLastRound: boolean;
}

export const RoundResponseActions: React.FC<RoundResponseActionsProps> = ({
  content,
  isVisible,
  isLastRound,
}) => {
  const { addSuccessToast } = useToasts();
  const { resend, isResending, isResponseLoading } = useSendMessage();

  const handleCopy = useCallback(() => {
    const isSuccess = copy(content);
    if (isSuccess) {
      addSuccessToast(labels.copySuccess);
    }
  }, [content, addSuccessToast]);

  const handleResend = useCallback(() => {
    resend();
  }, [resend]);

  // Disable resend button while any response is loading
  const isResendDisabled = isResending || isResponseLoading;

  return (
    <EuiFlexGroup
      direction="row"
      gutterSize="xs"
      responsive={false}
      css={css`
        opacity: ${isVisible ? 1 : 0};
        transition: opacity 0.2s ease;
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="copyClipboard"
          aria-label={labels.copy}
          onClick={handleCopy}
          color="text"
          data-test-subj="roundResponseCopyButton"
        />
      </EuiFlexItem>
      {isLastRound && (
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="refresh"
            aria-label={labels.resend}
            onClick={handleResend}
            color="text"
            isDisabled={isResendDisabled}
            isLoading={isResending}
            data-test-subj="roundResponseResendButton"
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
