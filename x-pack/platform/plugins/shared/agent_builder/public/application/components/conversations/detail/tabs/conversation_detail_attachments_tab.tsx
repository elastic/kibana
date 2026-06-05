/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import type { Conversation, VersionedAttachment } from '@kbn/agent-builder-common';
import { useAgentBuilderServices } from '../../../../hooks/use_agent_builder_service';
import { buildAttachmentDisplayModels } from './conversation_attachment_display_utils';
import { ConversationAttachmentListItem } from './conversation_attachment_list_item';

const labels = {
  empty: i18n.translate('xpack.agentBuilder.conversationDetail.attachments.empty', {
    defaultMessage: 'No attachments on this conversation yet.',
  }),
};

interface ConversationDetailAttachmentsTabProps {
  attachments?: VersionedAttachment[];
  conversation?: Pick<Conversation, 'rounds' | 'user'>;
}

export const ConversationDetailAttachmentsTab: React.FC<ConversationDetailAttachmentsTabProps> = ({
  attachments = [],
  conversation,
}) => {
  const { attachmentsService } = useAgentBuilderServices();

  const displayModels = useMemo(
    () =>
      buildAttachmentDisplayModels({
        attachments,
        getUiDefinition: (type) => attachmentsService.getAttachmentUiDefinition(type),
        conversation,
      }),
    [attachments, attachmentsService, conversation]
  );

  if (displayModels.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="paperClip"
        title={
          <h2>
            {i18n.translate('xpack.agentBuilder.conversationDetail.attachments.emptyTitle', {
              defaultMessage: 'No attachments',
            })}
          </h2>
        }
        body={labels.empty}
        data-test-subj="conversationDetailAttachmentsEmpty"
      />
    );
  }

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      responsive={false}
      data-test-subj="conversationDetailAttachmentsList"
    >
      {displayModels.map((model) => (
        <EuiFlexItem key={model.attachment.id} grow={false}>
          <ConversationAttachmentListItem model={model} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
