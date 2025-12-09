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
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { VersionedAttachment } from '@kbn/onechat-common/attachments';
import { getLatestVersion, isAttachmentActive } from '@kbn/onechat-common/attachments';
import { ConversationAttachmentItem } from './conversation_attachment_item';

export interface ConversationAttachmentsPanelProps {
  attachments?: VersionedAttachment[];
  onDeleteAttachment?: (attachmentId: string) => void;
  onRestoreAttachment?: (attachmentId: string) => void;
}

export const ConversationAttachmentsPanel: React.FC<ConversationAttachmentsPanelProps> = ({
  attachments,
  onDeleteAttachment,
  onRestoreAttachment,
}) => {
  const { activeAttachments, deletedAttachments, totalTokens } = useMemo(() => {
    if (!attachments?.length) {
      return { activeAttachments: [], deletedAttachments: [], totalTokens: 0 };
    }

    const active: VersionedAttachment[] = [];
    const deleted: VersionedAttachment[] = [];
    let tokens = 0;

    for (const attachment of attachments) {
      const latestVersion = getLatestVersion(attachment);
      if (isAttachmentActive(attachment)) {
        active.push(attachment);
        tokens += latestVersion?.estimated_tokens ?? 0;
      } else {
        deleted.push(attachment);
      }
    }

    return {
      activeAttachments: active,
      deletedAttachments: deleted,
      totalTokens: tokens,
    };
  }, [attachments]);

  // Don't render if no attachments
  if (!attachments?.length) {
    return null;
  }

  return (
    <EuiPanel paddingSize="s" hasBorder>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiTitle size="xxs">
          <h4>
            {i18n.translate('xpack.onechat.attachments.panelTitle', {
              defaultMessage: 'Attachments ({count})',
              values: { count: activeAttachments.length },
            })}
          </h4>
        </EuiTitle>

        {totalTokens > 0 && (
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.onechat.attachments.totalTokens', {
              defaultMessage: '~{tokens} tokens',
              values: { tokens: totalTokens },
            })}
          </EuiText>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="xs" />

      {activeAttachments.length > 0 && (
        <EuiFlexGroup wrap gutterSize="xs">
          {activeAttachments.map((attachment) => (
            <ConversationAttachmentItem
              key={attachment.id}
              attachment={attachment}
              onDelete={onDeleteAttachment ? () => onDeleteAttachment(attachment.id) : undefined}
            />
          ))}
        </EuiFlexGroup>
      )}

      {deletedAttachments.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiAccordion
            id="deleted-attachments"
            buttonContent={i18n.translate('xpack.onechat.attachments.deletedAccordion', {
              defaultMessage: 'Deleted ({count})',
              values: { count: deletedAttachments.length },
            })}
            paddingSize="xs"
          >
            <EuiFlexGroup wrap gutterSize="xs">
              {deletedAttachments.map((attachment) => (
                <ConversationAttachmentItem
                  key={attachment.id}
                  attachment={attachment}
                  isDeleted
                  onRestore={
                    onRestoreAttachment ? () => onRestoreAttachment(attachment.id) : undefined
                  }
                />
              ))}
            </EuiFlexGroup>
          </EuiAccordion>
        </>
      )}
    </EuiPanel>
  );
};
