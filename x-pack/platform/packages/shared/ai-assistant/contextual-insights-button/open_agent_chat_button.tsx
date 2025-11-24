/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButton } from '@elastic/eui';
import type { UiAttachment } from '@kbn/onechat-plugin/public/embeddable/types';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { OnechatPluginStart } from '@kbn/onechat-plugin/public';
import { oneChatDefaultAgentId } from '@kbn/onechat-common';

export interface OpenAgentChatButtonProps {
  attachments?: UiAttachment[];
  agentId?: string;
  sessionTag?: string;
  initialMessage?: string;
  newConversation?: boolean;
  label?: string;
  fill?: boolean;
  'data-test-subj'?: string;
  onClick?: () => void;
  onClose?: () => void;
  onechat?: OnechatPluginStart;
}

/**
 * A reusable button component that opens the OneChat conversation flyout with attachments.
 * This component can be used to open a chat with an agent and provide context via attachments.
 *
 * @example
 * ```tsx
 * <OpenAgentChatButton
 *   attachments={[
 *     {
 *       id: 'context-1',
 *       type: 'text',
 *       getContent: async () => ({ content: 'Context data' })
 *     }
 *   ]}
 *   agentId="elastic-ai-agent"
 *   initialMessage="Help me understand this data"
 *   label="Get help"
 * />
 * ```
 */
export function OpenAgentChatButton({
  attachments = [],
  agentId = oneChatDefaultAgentId,
  sessionTag,
  initialMessage,
  label,
  fill = true,
  'data-test-subj': dataTestSubj = 'open-agent-chat-button',
  onClick,
  onClose,
  onechat: onechatProp,
}: OpenAgentChatButtonProps) {
  const {
    services: { onechat: onechatFromContext },
  } = useKibana<{ onechat?: OnechatPluginStart }>();
  
  const onechat = onechatProp ?? onechatFromContext;

  const handleClick = useCallback(() => {
    onClick?.();

    if (!onechat) {
      return;
    }

    const finalAgentId = agentId || oneChatDefaultAgentId;

    onechat.openConversationFlyout({
      agentId: finalAgentId,
      sessionTag,
      newConversation: true,
      initialMessage,
      attachments,
      onClose,
    });
  }, [onechat, agentId, sessionTag, initialMessage, attachments, onClick, onClose]);

  if (!onechat) {
    return null;
  }

  if (!label) {
    return null;
  }

  return (
    <EuiButton
      onClick={handleClick}
      iconType="sparkles"
      fill={fill}
      data-test-subj={dataTestSubj}
    >
      {label}
    </EuiButton>
  );
}

