/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { InlineAttachmentWithActions } from './round_response/attachments/inline_attachment_with_actions';

interface AutoRenderInlineAttachmentProps {
  attachmentId: string;
  attachmentType: string;
  data: unknown;
  hidden?: boolean;
  origin?: string;
  version: number;
  conversationId: string;
  fallbackDescription: string;
}

export const AutoRenderInlineAttachment: React.FC<AutoRenderInlineAttachmentProps> = ({
  attachmentId,
  attachmentType,
  data,
  hidden,
  origin,
  version,
  conversationId,
  fallbackDescription,
}) => {
  const { attachmentsService } = useAgentBuilderServices();
  const { isEmbeddedContext: isSidebar } = useConversationContext();

  const uiDefinition = attachmentsService.getAttachmentUiDefinition(attachmentType);

  if (!uiDefinition?.renderInlineContent) {
    return (
      <EuiText color="subdued" size="xs" css={{ fontStyle: 'italic' }}>
        {i18n.translate('xpack.agentBuilder.roundAttachmentReferences.autoRender.attachmentAdded', {
          defaultMessage: 'Attachment added: {description}',
          values: { description: fallbackDescription },
        })}
      </EuiText>
    );
  }

  return (
    <InlineAttachmentWithActions
      attachment={{
        id: attachmentId,
        type: attachmentType,
        data,
        hidden,
        origin,
      }}
      attachmentsService={attachmentsService}
      isSidebar={isSidebar}
      conversationId={conversationId}
      version={version}
    />
  );
};
