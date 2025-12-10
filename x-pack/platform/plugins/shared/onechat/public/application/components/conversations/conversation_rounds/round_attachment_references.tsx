/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { AttachmentVersionRef, VersionedAttachment } from '@kbn/onechat-common/attachments';
import { AttachmentVersionTag, type AttachmentOperationType } from './attachment_version_tag';

export interface RoundAttachmentReferencesProps {
  /** Attachment version references for this round */
  attachmentRefs?: AttachmentVersionRef[];
  /** All conversation attachments for lookup */
  conversationAttachments?: VersionedAttachment[];
  /** Handler to open attachment viewer at specific version */
  onOpenAttachmentViewer?: (attachmentId: string, version: number) => void;
}

/**
 * Determines the operation type based on version comparison.
 */
const getOperationType = (
  attachment: VersionedAttachment,
  version: number
): AttachmentOperationType => {
  const versionData = attachment.versions.find((v) => v.version === version);
  if (!versionData) return 'updated';

  if (version === 1) {
    return 'created';
  }

  if (versionData.status === 'deleted') {
    return 'deleted';
  }

  // Check if previous version was deleted (this would be a restore)
  const previousVersion = attachment.versions.find((v) => v.version === version - 1);
  if (previousVersion?.status === 'deleted') {
    return 'restored';
  }

  return 'updated';
};

/**
 * Component showing attachment version references used in a conversation round.
 * Displays clickable tags that open the attachment viewer at specific versions.
 */
export const RoundAttachmentReferences: React.FC<RoundAttachmentReferencesProps> = ({
  attachmentRefs,
  conversationAttachments,
  onOpenAttachmentViewer,
}) => {
  const { euiTheme } = useEuiTheme();

  // Skip rendering if no refs or attachments
  if (!attachmentRefs?.length || !conversationAttachments?.length) {
    return null;
  }

  // Map refs to their attachment data
  const refWithAttachments = useMemo(() => {
    return attachmentRefs
      .map((ref) => {
        const attachment = conversationAttachments.find((a) => a.id === ref.attachment_id);
        if (!attachment) return null;
        return {
          ref,
          attachment,
          operation: getOperationType(attachment, ref.version),
        };
      })
      .filter(Boolean) as Array<{
        ref: AttachmentVersionRef;
        attachment: VersionedAttachment;
        operation: AttachmentOperationType;
      }>;
  }, [attachmentRefs, conversationAttachments]);

  // Handle click on tag
  const handleTagClick = useCallback(
    (attachmentId: string, version: number) => {
      onOpenAttachmentViewer?.(attachmentId, version);
    },
    [onOpenAttachmentViewer]
  );

  if (refWithAttachments.length === 0) {
    return null;
  }

  const containerStyles = css`
    padding: ${euiTheme.size.s};
    background-color: ${euiTheme.colors.lightestShade};
    border-radius: ${euiTheme.border.radius.medium};
    margin-top: ${euiTheme.size.s};
  `;

  return (
    <div css={containerStyles} data-test-subj="roundAttachmentReferences">
      <EuiFlexGroup direction="column" gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.onechat.roundAttachmentReferences.label', {
              defaultMessage: 'Attachments referenced:',
            })}
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            {refWithAttachments.map(({ ref, attachment, operation }) => (
              <EuiFlexItem key={`${ref.attachment_id}-${ref.version}`} grow={false}>
                <AttachmentVersionTag
                  attachment={attachment}
                  version={ref.version}
                  operation={operation}
                  onClick={() => handleTagClick(ref.attachment_id, ref.version)}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
