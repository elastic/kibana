/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { useAgentBuilderServices } from '../../../../hooks/use_agent_builder_service';
import { useConversationId } from '../../../../context/conversation/use_conversation_id';
import { useConversationContext } from '../../../../context/conversation/conversation_context';
import { InlineAttachmentWithActions } from '../response/attachments/inline_attachment_with_actions';
import {
  getScreenContext,
  toInlineAttachment,
} from '../response/attachments/to_inline_attachment_props';
import type { AttachmentItem } from '../types';

interface AttachmentEventProps {
  item: AttachmentItem;
  conversationAttachments?: VersionedAttachment[];
}

/**
 * An attachment the server asked to show inline, drawn as the same card the `<render_attachment>`
 * XML tag produces inside a HTML response. The empty first column keeps it aligned with turn content.
 */
export const AttachmentEvent: React.FC<AttachmentEventProps> = ({
  item,
  conversationAttachments,
}) => {
  const { euiTheme } = useEuiTheme();
  const { attachmentsService } = useAgentBuilderServices();
  const conversationId = useConversationId();
  const { isEmbeddedContext: isSidebar } = useConversationContext();

  const inlineAttachment = useMemo(
    () => toInlineAttachment(item.attachment, item.version),
    [item.attachment, item.version]
  );
  const screenContext = useMemo(
    () => getScreenContext(conversationAttachments),
    [conversationAttachments]
  );

  const avatarColumnStyles = css`
    min-inline-size: ${euiTheme.size.l};
  `;

  // Both are guaranteed by the resolve step and the conversation route; the checks only narrow the types.
  if (!conversationId || !inlineAttachment) {
    return null;
  }

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="flexStart"
      responsive={false}
      data-test-subj="agentBuilderTimelineAttachmentEvent"
    >
      <EuiFlexItem grow={false} css={avatarColumnStyles} />
      <EuiFlexItem grow={true}>
        <InlineAttachmentWithActions
          attachment={inlineAttachment}
          conversationId={conversationId}
          attachmentsService={attachmentsService}
          isSidebar={isSidebar}
          screenContext={screenContext}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
