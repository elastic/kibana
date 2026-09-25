/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import { EuiPanel, useEuiTheme } from '@elastic/eui';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { DrilldownErrorBoundary } from './drilldown_error_boundary';
import { toRenderAttachment } from './to_render_attachment';

export interface AttachmentSummaryListProps {
  attachments: VersionedAttachment[];
  attachmentsService: AttachmentServiceStartContract;
}

/** Stacks each attachment's section inside a bordered panel. */
export const AttachmentSummaryList = memo<AttachmentSummaryListProps>(
  ({ attachments, attachmentsService }) => {
    const { euiTheme } = useEuiTheme();

    if (attachments.length === 0) {
      return null;
    }

    const sections = attachments
      .map((attachment) => {
        const renderContent = attachmentsService.getAttachmentUiDefinition(
          attachment.type
        )?.renderConversationDetailsContent;

        if (!renderContent) return null;

        return (
          <DrilldownErrorBoundary key={attachment.id}>
            {renderContent({ attachment: toRenderAttachment(attachment) })}
          </DrilldownErrorBoundary>
        );
      })
      .filter(Boolean);

    if (sections.length === 0) {
      return null;
    }

    return (
      <EuiPanel
        hasBorder
        hasShadow={false}
        paddingSize="none"
        css={css({
          borderRadius: euiTheme.size.s,
          overflow: 'hidden',
          '& > * + *': { borderTop: euiTheme.border.thin },
        })}
        data-test-subj="attachmentSummaryPanel"
      >
        {sections}
      </EuiPanel>
    );
  }
);

AttachmentSummaryList.displayName = 'AttachmentSummaryList';
