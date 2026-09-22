/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, type EuiFlexGroupProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  Attachment,
  AttachmentVersionRef,
  AttachmentRefActor,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import type { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { css } from '@emotion/react';
import { RoundAttachmentPill } from './round_attachment_pill';
import { useResolvedAttachmentReferences } from './use_resolved_attachment_references';

export interface RoundAttachmentReferencesProps {
  attachmentRefs?: AttachmentVersionRef[];
  conversationAttachments?: VersionedAttachment[];
  fallbackAttachments?: Attachment[];
  actorFilter?: AttachmentRefActor[];
  justifyContent?: EuiFlexGroupProps['justifyContent'];
  /** Attachment types to exclude from rendering. Hidden when all remaining refs are excluded. */
  excludeTypes?: AttachmentType[];
}

const labels = {
  attachments: i18n.translate('xpack.agentBuilder.roundAttachmentReferences.attachments', {
    defaultMessage: 'Attachments',
  }),
  added: i18n.translate('xpack.agentBuilder.roundAttachmentReferences.added', {
    defaultMessage: 'Added',
  }),
};

export const RoundAttachmentReferences: React.FC<RoundAttachmentReferencesProps> = ({
  attachmentRefs,
  conversationAttachments,
  fallbackAttachments,
  actorFilter,
  justifyContent = 'flexStart',
  excludeTypes,
}) => {
  const allResolved = useResolvedAttachmentReferences({
    attachmentRefs,
    conversationAttachments,
    fallbackAttachments,
    actorFilter,
  });

  const resolvedReferences = excludeTypes?.length
    ? allResolved.filter((ref) => !excludeTypes.includes(ref.attachment.type as AttachmentType))
    : allResolved;

  if (resolvedReferences.length === 0) {
    return null;
  }

  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup
        gutterSize="s"
        direction="column"
        responsive={false}
        data-test-subj="agentBuilderRoundAttachmentReferences"
      >
        <EuiFlexItem grow={false}>
          <EuiText
            size="xs"
            color="subdued"
            css={
              justifyContent === 'flexEnd'
                ? css`
                    text-align: right;
                  `
                : undefined
            }
          >
            {labels.added}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            direction="row"
            wrap
            responsive={false}
            gutterSize="s"
            justifyContent={justifyContent}
            role="list"
            aria-label={labels.attachments}
          >
            {resolvedReferences.map((ref) => (
              <EuiFlexItem grow={false} key={`${ref.attachment.id}-v${ref.version}-${ref.actor}`}>
                <RoundAttachmentPill attachment={ref.attachment} version={ref.version} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
