/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { VersionedAttachment } from '@kbn/onechat-common/attachments';
import { AttachmentType, getLatestVersion, isAttachmentActive } from '@kbn/onechat-common/attachments';
import { ConversationAttachmentItem } from './conversation_attachment_item';

/** Default threshold for auto-collapsing the panel */
const AUTO_COLLAPSE_THRESHOLD = 3;

export interface ConversationAttachmentsPanelProps {
  attachments?: VersionedAttachment[];
  /** Set of attachment IDs that are referenced in conversation rounds */
  referencedAttachmentIds?: Set<string>;
  /** Handler for soft delete (marks as deleted, can be restored) */
  onDeleteAttachment?: (attachmentId: string) => void;
  /** Handler for permanent delete (completely removes, only for unreferenced attachments) */
  onPermanentDeleteAttachment?: (attachmentId: string) => void;
  onRestoreAttachment?: (attachmentId: string) => void;
  /** Handler to open attachment viewer */
  onOpenAttachmentViewer?: (attachmentId: string, version?: number) => void;
  /**
   * Whether to auto-collapse when attachment count exceeds threshold.
   * When true, panel will be collapsed by default if there are more than 3 active attachments.
   */
  autoCollapse?: boolean;
  /** Custom threshold for auto-collapse (default: 3) */
  autoCollapseThreshold?: number;
}

const labels = {
  panelTitle: (count: number) =>
    i18n.translate('xpack.onechat.attachments.panelTitle', {
      defaultMessage: 'Attachments ({count})',
      values: { count },
    }),
  totalTokens: (tokens: number) =>
    i18n.translate('xpack.onechat.attachments.totalTokens', {
      defaultMessage: '~{tokens} tokens',
      values: { tokens },
    }),
  deletedAccordion: (count: number) =>
    i18n.translate('xpack.onechat.attachments.deletedAccordion', {
      defaultMessage: 'Deleted ({count})',
      values: { count },
    }),
  expandPanel: i18n.translate('xpack.onechat.attachments.expandPanel', {
    defaultMessage: 'Expand attachments panel',
  }),
  collapsePanel: i18n.translate('xpack.onechat.attachments.collapsePanel', {
    defaultMessage: 'Collapse attachments panel',
  }),
};

export const ConversationAttachmentsPanel: React.FC<ConversationAttachmentsPanelProps> = ({
  attachments,
  referencedAttachmentIds,
  onDeleteAttachment,
  onPermanentDeleteAttachment,
  onRestoreAttachment,
  onOpenAttachmentViewer,
  autoCollapse = false,
  autoCollapseThreshold = AUTO_COLLAPSE_THRESHOLD,
}) => {
  const deletedAccordionId = useGeneratedHtmlId({ prefix: 'deletedAttachments' });

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

  // Determine initial collapsed state based on autoCollapse setting and attachment count
  const shouldAutoCollapse = autoCollapse && activeAttachments.length > autoCollapseThreshold;
  const [isCollapsed, setIsCollapsed] = useState(shouldAutoCollapse);

  // Don't render if no attachments
  if (!attachments?.length) {
    return null;
  }

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  return (
    <EuiPanel paddingSize="s" hasBorder>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={isCollapsed ? labels.expandPanel : labels.collapsePanel}
                position="top"
              >
                <EuiButtonIcon
                  iconType={isCollapsed ? 'arrowRight' : 'arrowDown'}
                  onClick={toggleCollapse}
                  aria-label={isCollapsed ? labels.expandPanel : labels.collapsePanel}
                  aria-expanded={!isCollapsed}
                  size="xs"
                  color="text"
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs">
                <strong>{labels.panelTitle(activeAttachments.length)}</strong>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {totalTokens > 0 && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {labels.totalTokens(totalTokens)}
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      {!isCollapsed && (
        <>
          <EuiSpacer size="xs" />

          {activeAttachments.length > 0 && (
            <EuiFlexGroup wrap gutterSize="xs">
              {activeAttachments.map((attachment) => {
                const isReferenced = referencedAttachmentIds?.has(attachment.id) ?? false;
                // Screen context attachments should never be deletable
                const isScreenContext = attachment.type === AttachmentType.screenContext;
                const canDelete = !isScreenContext;
                // Attachments with client_id (from flyout configuration) cannot be permanently deleted
                const canPermanentDelete = canDelete && !isReferenced && !attachment.client_id;

                return (
                  <ConversationAttachmentItem
                    key={attachment.id}
                    attachment={attachment}
                    isReferenced={isReferenced}
                    onDelete={
                      canDelete && onDeleteAttachment
                        ? () => onDeleteAttachment(attachment.id)
                        : undefined
                    }
                    onPermanentDelete={
                      canPermanentDelete && onPermanentDeleteAttachment
                        ? () => onPermanentDeleteAttachment(attachment.id)
                        : undefined
                    }
                    onClick={
                      onOpenAttachmentViewer
                        ? () => onOpenAttachmentViewer(attachment.id, attachment.current_version)
                        : undefined
                    }
                  />
                );
              })}
            </EuiFlexGroup>
          )}

          {deletedAttachments.length > 0 && (
            <>
              <EuiSpacer size="s" />
              <EuiAccordion
                id={deletedAccordionId}
                buttonContent={labels.deletedAccordion(deletedAttachments.length)}
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
        </>
      )}
    </EuiPanel>
  );
};
