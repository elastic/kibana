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

/** Stacks each attachment's section as its own bordered panel, with space between groups. */
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
          <EuiPanel
            key={attachment.id}
            hasBorder
            hasShadow={false}
            paddingSize="none"
            css={css({
              borderRadius: euiTheme.size.s,
              overflow: 'hidden',
            })}
            data-test-subj="attachmentSummaryGroupPanel"
          >
            <DrilldownErrorBoundary>
              {renderContent({ attachment: toRenderAttachment(attachment) })}
            </DrilldownErrorBoundary>
          </EuiPanel>
        );
      })
      .filter(Boolean);

    if (sections.length === 0) {
      return null;
    }

    return (
      <div
        css={css({
          display: 'flex',
          flexDirection: 'column',
          gap: euiTheme.size.m,
        })}
        data-test-subj="attachmentSummaryPanel"
      >
        {sections}
      </div>
    );
  }
);

AttachmentSummaryList.displayName = 'AttachmentSummaryList';
