/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import type {
  AttachmentAddedEvent,
  ConversationEvent,
  UserMessageEvent,
} from '@kbn/agent-builder-common';
import { TimelineEventType } from '@kbn/agent-builder-common';
import type { UnknownAttachment, VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import { useConversation } from '../../../hooks/use_conversation';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { InlineAttachmentWithActions } from '../conversation_rounds/round_response/attachments/inline_attachment_with_actions';

const labels = {
  journal: i18n.translate('xpack.agentBuilder.conversationJournal.ariaLabel', {
    defaultMessage: 'Investigation journal',
  }),
};

const isJournalUserMessage = (event: ConversationEvent): event is UserMessageEvent =>
  event.type === TimelineEventType.userMessage && event.execution_id === undefined;

const isAttachmentAdded = (event: ConversationEvent): event is AttachmentAddedEvent =>
  event.type === TimelineEventType.attachmentAdded;

const flattenVersionedAttachment = (
  attachment: VersionedAttachment
): UnknownAttachment | undefined => {
  const latestVersion = getLatestVersion(attachment);
  if (!latestVersion) {
    return undefined;
  }

  return {
    data: latestVersion.data,
    description: attachment.description,
    hidden: attachment.hidden,
    id: attachment.id,
    origin: attachment.origin,
    type: attachment.type,
    versionData: {
      createdAt: latestVersion.created_at,
      version: latestVersion.version,
      versionCount: attachment.versions.length,
    },
  };
};

const JournalNote = ({ event }: { event: UserMessageEvent }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      color="subdued"
      css={css`
        border-radius: ${euiTheme.border.radius.small} ${euiTheme.size.base} ${euiTheme.size.base}
          ${euiTheme.size.base};
      `}
      data-test-subj="agentBuilderJournalNote"
      hasBorder={false}
      hasShadow={false}
      paddingSize="m"
    >
      <EuiText size="s">
        <p>{event.data.message}</p>
      </EuiText>
    </EuiPanel>
  );
};

/**
 * Renders trigger_mode:never journal notes and inline attachments that live on
 * conversation.events rather than rounds. Conversations that predate events still
 * show their attachments. Desk-test only (PR4); do not fold into PR1–PR3.
 */
export const ConversationJournal: React.FC = () => {
  const { conversation } = useConversation();
  const conversationId = useConversationId();
  const { attachmentsService } = useAgentBuilderServices();

  const attachmentsById = useMemo(() => {
    const entries = (conversation?.attachments ?? []).flatMap((attachment) => {
      const flattened = flattenVersionedAttachment(attachment);
      return flattened ? ([[attachment.id, flattened]] as const) : [];
    });
    return new Map(entries);
  }, [conversation?.attachments]);

  const items = conversation?.events ?? [];
  const hasAttachmentEvents = items.some(isAttachmentAdded);
  const leftoverAttachments = hasAttachmentEvents
    ? []
    : [...attachmentsById.values()].filter((attachment) => !attachment.hidden);

  if (!conversationId || (items.length === 0 && leftoverAttachments.length === 0)) {
    return null;
  }

  return (
    <EuiFlexGroup
      aria-label={labels.journal}
      data-test-subj="agentBuilderConversationJournal"
      direction="column"
      gutterSize="m"
    >
      {items.flatMap((event) => {
        if (isJournalUserMessage(event)) {
          return [
            <EuiFlexItem grow={false} key={event.id}>
              <JournalNote event={event} />
            </EuiFlexItem>,
          ];
        }

        if (isAttachmentAdded(event)) {
          const attachment = attachmentsById.get(event.data.attachment_id);
          if (!attachment || attachment.hidden) {
            return [];
          }

          return [
            <EuiFlexItem grow={false} key={event.id}>
              <div data-test-subj="agentBuilderJournalAttachment">
                <InlineAttachmentWithActions
                  attachment={attachment}
                  attachmentsService={attachmentsService}
                  conversationId={conversationId}
                  isSidebar={false}
                />
              </div>
            </EuiFlexItem>,
          ];
        }

        return [];
      })}
      {leftoverAttachments.map((attachment) => (
        <EuiFlexItem grow={false} key={attachment.id}>
          <div data-test-subj="agentBuilderJournalAttachment">
            <InlineAttachmentWithActions
              attachment={attachment}
              attachmentsService={attachmentsService}
              conversationId={conversationId}
              isSidebar={false}
            />
          </div>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
