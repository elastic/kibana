/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiBadge,
  EuiTimeline,
  EuiTimelineItem,
  EuiIcon,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { VersionedAttachment, AttachmentVersion } from '@kbn/onechat-common/attachments';
import type { ConversationRound } from '@kbn/onechat-common';
import { useOnechatServices } from '../../../hooks/use_onechat_service';

export interface AttachmentHistoryPanelProps {
  /** All versioned attachments in the conversation */
  attachments?: VersionedAttachment[];
  /** Conversation rounds for correlation */
  rounds?: ConversationRound[];
  /** Handler to open attachment viewer at specific version */
  onOpenAttachmentViewer?: (attachmentId: string, version: number) => void;
}

interface HistoryEvent {
  timestamp: string;
  attachmentId: string;
  attachmentType: string;
  version: number;
  operation: 'created' | 'updated' | 'deleted' | 'restored';
  estimatedTokens?: number;
}

/**
 * Gets all version change events from attachments, sorted by timestamp.
 */
const getHistoryEvents = (attachments: VersionedAttachment[]): HistoryEvent[] => {
  const events: HistoryEvent[] = [];

  for (const attachment of attachments) {
    for (const version of attachment.versions) {
      let operation: HistoryEvent['operation'];

      if (version.version === 1) {
        operation = 'created';
      } else if (version.status === 'deleted') {
        operation = 'deleted';
      } else {
        // Check if previous version was deleted (this is a restore)
        const prevVersion = attachment.versions.find((v) => v.version === version.version - 1);
        operation = prevVersion?.status === 'deleted' ? 'restored' : 'updated';
      }

      events.push({
        timestamp: version.created_at,
        attachmentId: attachment.id,
        attachmentType: attachment.type,
        version: version.version,
        operation,
        estimatedTokens: version.estimated_tokens,
      });
    }
  }

  // Sort by timestamp descending (newest first)
  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

/**
 * Gets the icon and color for an operation type.
 */
const getOperationStyle = (
  operation: HistoryEvent['operation']
): { icon: string; color: string } => {
  switch (operation) {
    case 'created':
      return { icon: 'plus', color: 'success' };
    case 'updated':
      return { icon: 'pencil', color: 'primary' };
    case 'deleted':
      return { icon: 'trash', color: 'danger' };
    case 'restored':
      return { icon: 'refresh', color: 'warning' };
    default:
      return { icon: 'document', color: 'default' };
  }
};

/**
 * Gets the operation label.
 */
const getOperationLabel = (operation: HistoryEvent['operation']): string => {
  switch (operation) {
    case 'created':
      return i18n.translate('xpack.onechat.attachmentHistory.created', {
        defaultMessage: 'Created',
      });
    case 'updated':
      return i18n.translate('xpack.onechat.attachmentHistory.updated', {
        defaultMessage: 'Updated',
      });
    case 'deleted':
      return i18n.translate('xpack.onechat.attachmentHistory.deleted', {
        defaultMessage: 'Deleted',
      });
    case 'restored':
      return i18n.translate('xpack.onechat.attachmentHistory.restored', {
        defaultMessage: 'Restored',
      });
    default:
      return operation;
  }
};

/**
 * Panel showing the history of all attachment changes in a conversation.
 * Displayed as a collapsible timeline.
 */
export const AttachmentHistoryPanel: React.FC<AttachmentHistoryPanelProps> = ({
  attachments,
  rounds,
  onOpenAttachmentViewer,
}) => {
  const { euiTheme } = useEuiTheme();
  const { attachmentsService } = useOnechatServices();

  const historyEvents = useMemo(() => {
    return attachments ? getHistoryEvents(attachments) : [];
  }, [attachments]);

  if (!attachments?.length || historyEvents.length === 0) {
    return null;
  }

  const containerStyles = css`
    .euiAccordion__button {
      padding: ${euiTheme.size.s};
    }
  `;

  return (
    <EuiAccordion
      id="attachment-history"
      buttonContent={i18n.translate('xpack.onechat.attachmentHistory.title', {
        defaultMessage: 'Attachment History ({count} changes)',
        values: { count: historyEvents.length },
      })}
      paddingSize="s"
      css={containerStyles}
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        {historyEvents.map((event, index) => {
          const attachment = attachments.find((a) => a.id === event.attachmentId);
          const uiDefinition = attachmentsService.getAttachmentUiDefinition(event.attachmentType);
          const displayName = attachment?.description || uiDefinition?.getLabel(attachment as any) || event.attachmentType;
          const iconType = uiDefinition?.getIcon?.() || 'document';
          const { icon, color } = getOperationStyle(event.operation);
          const operationLabel = getOperationLabel(event.operation);

          const formattedDate = new Date(event.timestamp).toLocaleString();

          return (
            <EuiFlexItem key={`${event.attachmentId}-${event.version}`} grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiBadge color={color} iconType={icon}>
                    {operationLabel}
                  </EuiBadge>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiIcon type={iconType} size="s" />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText
                        size="s"
                        css={css`
                          cursor: pointer;
                          &:hover {
                            text-decoration: underline;
                          }
                        `}
                        onClick={() => onOpenAttachmentViewer?.(event.attachmentId, event.version)}
                      >
                        {displayName} <small>v{event.version}</small>
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>

                <EuiFlexItem grow>
                  <EuiText size="xs" color="subdued">
                    {formattedDate}
                  </EuiText>
                </EuiFlexItem>

                {event.estimatedTokens && (
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      ~{event.estimatedTokens}t
                    </EuiText>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    </EuiAccordion>
  );
};
