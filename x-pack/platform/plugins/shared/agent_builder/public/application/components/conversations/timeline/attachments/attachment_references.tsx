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
import { css } from '@emotion/react';
import { AttachmentPill } from './attachment_pill';
import {
  useResolvedAttachmentReferences,
  type ResolvedReference,
} from './use_resolved_attachment_references';

export interface AttachmentReferencesProps {
  attachmentRefs?: AttachmentVersionRef[];
  conversationAttachments?: VersionedAttachment[];
  fallbackAttachments?: Attachment[];
  actorFilter?: AttachmentRefActor[];
  justifyContent?: EuiFlexGroupProps['justifyContent'];
  /** Refs to leave out of the list. Hidden when all refs are excluded. */
  isExcluded?: (ref: ResolvedReference) => boolean;
}

const labels = {
  attachments: i18n.translate('xpack.agentBuilder.attachmentReferences.attachments', {
    defaultMessage: 'Attachments',
  }),
  added: i18n.translate('xpack.agentBuilder.attachmentReferences.added', {
    defaultMessage: 'Added',
  }),
};

export const AttachmentReferences: React.FC<AttachmentReferencesProps> = ({
  attachmentRefs,
  conversationAttachments,
  fallbackAttachments,
  actorFilter,
  justifyContent = 'flexStart',
  isExcluded,
}) => {
  const allResolved = useResolvedAttachmentReferences({
    attachmentRefs,
    conversationAttachments,
    fallbackAttachments,
    actorFilter,
  });

  const resolvedReferences = isExcluded
    ? allResolved.filter((ref) => !isExcluded(ref))
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
        data-test-subj="agentBuilderAttachmentReferences"
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
                <AttachmentPill attachment={ref.attachment} version={ref.version} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
