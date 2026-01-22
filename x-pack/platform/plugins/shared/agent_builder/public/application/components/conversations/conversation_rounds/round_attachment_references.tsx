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
  AttachmentVersionRef,
  AttachmentRefOperation,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import { ATTACHMENT_REF_OPERATION } from '@kbn/agent-builder-common/attachments';
import { AttachmentReferencePill } from './round_attachment_reference_pill';

export interface RoundAttachmentReferencesProps {
  attachmentRefs?: AttachmentVersionRef[];
  conversationAttachments?: VersionedAttachment[];
  justifyContent?: EuiFlexGroupProps['justifyContent'];
}

interface ResolvedReference {
  attachment: VersionedAttachment;
  version: number;
  operation: AttachmentRefOperation;
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

  return version === 1
    ? ATTACHMENT_REF_OPERATION.created
    : ATTACHMENT_REF_OPERATION.updated;
};

export const RoundAttachmentReferences: React.FC<RoundAttachmentReferencesProps> = ({
  attachmentRefs,
  conversationAttachments,
  justifyContent = 'flexStart',
}) => {
  const resolvedReferences = useMemo((): ResolvedReference[] => {
    if (!attachmentRefs?.length || !conversationAttachments?.length) {
      return [];
    }

    const attachmentMap = new Map<string, VersionedAttachment>();
    for (const attachment of conversationAttachments) {
      if (attachment.hidden) {
        continue;
      }
      attachmentMap.set(attachment.id, attachment);
    }

    const resolved: ResolvedReference[] = [];
    for (const ref of attachmentRefs) {
      const attachment = attachmentMap.get(ref.attachment_id);
      if (!attachment) {
        continue;
      }

      resolved.push({
        attachment,
        version: ref.version,
        operation: resolveOperation(ref.operation, ref.version),
      });
    }

    return resolved;
  }, [attachmentRefs, conversationAttachments]);

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
        <EuiFlexItem key={`${ref.attachment.id}-v${ref.version}`} grow={false}>
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

