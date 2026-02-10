/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, type EuiFlexGroupProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  Attachment,
  AttachmentVersionRef,
  AttachmentRefActor,
  AttachmentRefOperation,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import {
  ATTACHMENT_REF_ACTOR,
  ATTACHMENT_REF_OPERATION,
  estimateTokens,
  hashContent,
} from '@kbn/agent-builder-common/attachments';
import { AttachmentReferencePill } from './round_attachment_reference_pill';

export interface RoundAttachmentReferencesProps {
  attachmentRefs?: AttachmentVersionRef[];
  conversationAttachments?: VersionedAttachment[];
  fallbackAttachments?: Attachment[];
  actorFilter?: AttachmentRefActor[];
  justifyContent?: EuiFlexGroupProps['justifyContent'];
}

interface ResolvedReference {
  attachment: VersionedAttachment;
  version: number;
  operation: AttachmentRefOperation;
  actor: AttachmentRefActor;
}

const labels = {
  attachments: i18n.translate('xpack.agentBuilder.roundAttachmentReferences.attachments', {
    defaultMessage: 'Attachments',
  }),
};

const resolveOperation = (
  refOperation: AttachmentRefOperation | undefined,
  version: number
): AttachmentRefOperation => {
  if (refOperation) {
    return refOperation;
  }

  return version === 1 ? ATTACHMENT_REF_OPERATION.created : ATTACHMENT_REF_OPERATION.updated;
};

const resolveActor = (actor: AttachmentRefActor | undefined): AttachmentRefActor => {
  return actor ?? ATTACHMENT_REF_ACTOR.system;
};

const buildFallbackVersionedAttachments = (attachments: Attachment[]): VersionedAttachment[] => {
  const now = new Date().toISOString();
  return attachments.map((attachment, index) => ({
    id: attachment.id ?? `pending-${index}`,
    type: attachment.type,
    versions: [
      {
        version: 1,
        data: attachment.data,
        created_at: now,
        content_hash: hashContent(attachment.data),
        estimated_tokens: estimateTokens(attachment.data),
      },
    ],
    current_version: 1,
    active: true,
    hidden: attachment.hidden,
  }));
};

export const RoundAttachmentReferences: React.FC<RoundAttachmentReferencesProps> = ({
  attachmentRefs,
  conversationAttachments,
  fallbackAttachments,
  actorFilter,
  justifyContent = 'flexStart',
}) => {
  const resolvedReferences = useMemo((): ResolvedReference[] => {
    const fallbackVersioned = fallbackAttachments?.length
      ? buildFallbackVersionedAttachments(fallbackAttachments)
      : [];
    const effectiveAttachments = conversationAttachments?.length
      ? [
          ...conversationAttachments,
          ...fallbackVersioned.filter((attachment) =>
            conversationAttachments.every((existing) => existing.id !== attachment.id)
          ),
        ]
      : fallbackVersioned;

    const refs =
      attachmentRefs?.length || !fallbackAttachments?.length
        ? attachmentRefs
        : fallbackAttachments.map((attachment, index) => ({
            attachment_id: attachment.id ?? `pending-${index}`,
            version: 1,
            operation: ATTACHMENT_REF_OPERATION.created,
            actor: ATTACHMENT_REF_ACTOR.user,
          }));

    if (!refs?.length || !effectiveAttachments.length) {
      return [];
    }

    const attachmentMap = new Map<string, VersionedAttachment>();
    for (const attachment of effectiveAttachments) {
      if (attachment.hidden) {
        continue;
      }
      attachmentMap.set(attachment.id, attachment);
    }

    const resolved: ResolvedReference[] = [];
    for (const ref of refs) {
      const attachment = attachmentMap.get(ref.attachment_id);
      if (!attachment) {
        continue;
      }

      const actor = resolveActor(ref.actor);
      if (actorFilter?.length && !actorFilter.includes(actor)) {
        continue;
      }

      const operation = resolveOperation(ref.operation, ref.version);
      if (operation === ATTACHMENT_REF_OPERATION.read) {
        continue;
      }

      resolved.push({
        attachment,
        version: ref.version,
        operation,
        actor,
      });
    }

    return resolved;
  }, [attachmentRefs, conversationAttachments, fallbackAttachments, actorFilter]);

  if (resolvedReferences.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup
      gutterSize="s"
      wrap
      responsive={false}
      justifyContent={justifyContent}
      role="list"
      aria-label={labels.attachments}
      data-test-subj="agentBuilderRoundAttachmentReferences"
    >
      {resolvedReferences.map((ref) => (
        <EuiFlexItem key={`${ref.attachment.id}-v${ref.version}-${ref.actor}`} grow={false}>
          <AttachmentReferencePill
            attachment={ref.attachment}
            version={ref.version}
            operation={ref.operation}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
