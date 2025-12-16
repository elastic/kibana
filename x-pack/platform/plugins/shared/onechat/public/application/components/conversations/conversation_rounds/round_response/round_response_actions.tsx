/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import copy from 'copy-to-clipboard';
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { appPaths } from '../../../../utils/app_paths';
import { useConversationId } from '../../../../context/conversation/use_conversation_id';
import { useToasts } from '../../../../hooks/use_toasts';
import { useOnechatServices } from '../../../../hooks/use_onechat_service';
import { useNavigation } from '../../../../hooks/use_navigation';

const labels = {
  copy: i18n.translate('xpack.onechat.roundResponseActions.copy', {
    defaultMessage: 'Copy response',
  }),
  fork: i18n.translate('xpack.onechat.roundResponseActions.fork', {
    defaultMessage: 'Fork to new conversation',
  }),
  copySuccess: i18n.translate('xpack.onechat.roundResponseActions.copySuccess', {
    defaultMessage: 'Response copied to clipboard',
  }),
  forkError: i18n.translate('xpack.onechat.roundResponseActions.forkError', {
    defaultMessage: 'Failed to fork to new conversation',
  }),
};

interface RoundResponseActionsProps {
  content: string;
  isVisible: boolean;
  type: 'input' | 'response';
  roundId: string;
}

export const RoundResponseActions: React.FC<RoundResponseActionsProps> = ({
  content,
  isVisible,
  type,
  roundId,
}) => {
  const conversationId = useConversationId();
  const { addSuccessToast, addErrorToast } = useToasts();
  const { conversationsService } = useOnechatServices();
  const { navigateToOnechatUrl } = useNavigation();

  const handleCopy = useCallback(() => {
    const isSuccess = copy(content);
    if (isSuccess) {
      addSuccessToast(labels.copySuccess);
    }
  }, [content, addSuccessToast]);

  const [isForking, setIsForking] = useState(false);

  const handleFork = useCallback(async () => {
    if (!conversationId) {
      return;
    }
    setIsForking(true);
    try {
      const { id: forkedConversationId } = await conversationsService.fork({
        conversationId,
        roundId,
      });
      navigateToOnechatUrl(appPaths.chat.conversation({ conversationId: forkedConversationId }));
    } catch (e) {
      addErrorToast(labels.forkError);
    } finally {
      setIsForking(false);
    }
  }, [conversationId, roundId, conversationsService, navigateToOnechatUrl, addErrorToast]);

  const actions = [
    <EuiToolTip content={labels.copy} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="copyClipboard"
        aria-label={labels.copy}
        onClick={handleCopy}
        color="text"
        data-test-subj="roundResponseCopyButton"
      />
    </EuiToolTip>,
    ...(type === 'response'
      ? [
          <EuiToolTip content={labels.fork} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="branch"
              aria-label={labels.fork}
              onClick={handleFork}
              color="text"
              isLoading={isForking}
              isDisabled={isForking}
              data-test-subj="roundResponseForkButton"
            />
          </EuiToolTip>,
        ]
      : []),
  ];

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
      {actions.map((action) => (
        <EuiFlexItem key={action.key} grow={false}>
          {action}
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
