/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import {
  getActiveAttachments,
  type VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import { AttachmentErrorBoundary } from './attachment_error_boundary';
import { toRenderAttachment } from './to_render_attachment';

const PILL_TYPES = new Set([
  'security.alert',
  'security.alerts',
  'security.attack_discovery',
  'security.entity',
  'security.rule',
]);

export interface AttachmentsSectionProps {
  attachments: VersionedAttachment[] | undefined;
  attachmentsService: AttachmentServiceStartContract;
}

export const AttachmentsSection = memo<AttachmentsSectionProps>(
  ({ attachments, attachmentsService }) => {
    const items = useMemo(() => {
      if (!attachments || attachments.length === 0) return [];
      const visible = getActiveAttachments(attachments).filter((a) => !a.hidden);

      const result: React.ReactNode[] = [];
      for (const attachment of visible) {
        if (!PILL_TYPES.has(attachment.type)) continue;

        const def = attachmentsService.getAttachmentUiDefinition(attachment.type);
        if (!def?.renderConversationDetailsContent) continue;

        const content = def.renderConversationDetailsContent({
          attachment: toRenderAttachment(attachment),
        });

        if (content != null) {
          result.push(
            <AttachmentErrorBoundary key={attachment.id}>
              <EuiFlexItem grow={false}>{content}</EuiFlexItem>
            </AttachmentErrorBoundary>
          );
        }
      }
      return result;
    }, [attachments, attachmentsService]);

    if (items.length === 0) return null;

    return (
      <EuiFlexGroup wrap gutterSize="s" responsive={false}>
        {items}
      </EuiFlexGroup>
    );
  }
);
AttachmentsSection.displayName = 'AttachmentsSection';
