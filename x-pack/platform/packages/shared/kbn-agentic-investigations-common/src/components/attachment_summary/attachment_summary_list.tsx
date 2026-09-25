/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiPanel,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { AttachmentSummaryRow } from './attachment_summary_row';
import { DrilldownErrorBoundary } from './drilldown_error_boundary';
import { toRenderAttachment } from './to_render_attachment';
import type { SummaryAttachment } from './select_summary_attachments';
import { ATTACHMENT_SUMMARY_SHOW_LESS, attachmentSummaryShowMore } from './translations';

export const DEFAULT_COLLAPSED_COUNT = 5;

export interface AttachmentSummaryListProps {
  attachments: SummaryAttachment[];
  attachmentsService: AttachmentServiceStartContract;
  /** Rows shown before the user expands the list. */
  collapsedCount?: number;
}

/**
 * The attachment rows in a single bordered panel, collapsed until expanded. Takes the attachments
 * it should show, so any surface can supply its own selection.
 */
export const AttachmentSummaryList = memo<AttachmentSummaryListProps>(
  ({ attachments, attachmentsService, collapsedCount = DEFAULT_COLLAPSED_COUNT }) => {
    const { euiTheme } = useEuiTheme();
    const listId = useGeneratedHtmlId({ prefix: 'attachmentSummaryList' });
    const [isExpanded, setIsExpanded] = useState(false);

    // The drill-down lives here rather than on the row so that clicking several rows mounts one
    // at a time: each carries a provider stack, and the data view manager it initialises expects
    // a single mount. The counter keys the subtree, so re-clicking the same row opens it again.
    const [activeDrilldown, setActiveDrilldown] = useState<{
      attachment: VersionedAttachment;
      count: number;
    }>();

    const activeDefinition = activeDrilldown
      ? attachmentsService.getAttachmentUiDefinition(activeDrilldown.attachment.type)
      : undefined;
    const renderDrilldown = activeDefinition?.renderConversationDetailsContent;

    if (attachments.length === 0) {
      return null;
    }

    const hiddenCount = attachments.length - collapsedCount;
    const isCollapsible = hiddenCount > 0;
    const visibleAttachments =
      isCollapsible && !isExpanded ? attachments.slice(0, collapsedCount) : attachments;

    return (
      <EuiPanel
        hasBorder
        hasShadow={false}
        paddingSize="none"
        css={css({ borderRadius: euiTheme.size.s })}
        data-test-subj="attachmentSummaryPanel"
      >
        <EuiFlexGroup
          component="ul"
          id={listId}
          direction="column"
          gutterSize="none"
          responsive={false}
          css={css({ margin: 0, padding: 0, listStyle: 'none' })}
        >
          {visibleAttachments.map(({ attachment, typeName }, index) => (
            <AttachmentSummaryRow
              key={attachment.id}
              attachment={attachment}
              typeName={typeName}
              attachmentsService={attachmentsService}
              hasTopBorder={index > 0}
              onActivate={() =>
                setActiveDrilldown((previous) => ({
                  attachment,
                  count: (previous?.count ?? 0) + 1,
                }))
              }
            />
          ))}
        </EuiFlexGroup>

        {isCollapsible && (
          <div
            css={css({
              padding: `${euiTheme.size.xs} ${euiTheme.size.s}`,
              borderTop: euiTheme.border.thin,
            })}
          >
            <EuiButtonEmpty
              size="xs"
              flush="left"
              aria-expanded={isExpanded}
              aria-controls={listId}
              onClick={() => setIsExpanded((expanded) => !expanded)}
              data-test-subj="attachmentSummaryToggle"
            >
              {isExpanded ? ATTACHMENT_SUMMARY_SHOW_LESS : attachmentSummaryShowMore(hiddenCount)}
            </EuiButtonEmpty>
          </div>
        )}

        {/* Mounted for its side effect: the drill-down opens a flyout and renders nothing of its
            own. Kept out of view because the provider stack behind it carries a panel-sized
            loading state, which would distort the list. */}
        {activeDrilldown && renderDrilldown ? (
          <div css={css({ display: 'none' })} key={activeDrilldown.count}>
            <DrilldownErrorBoundary>
              {renderDrilldown({ attachment: toRenderAttachment(activeDrilldown.attachment) })}
            </DrilldownErrorBoundary>
          </div>
        ) : null}
      </EuiPanel>
    );
  }
);

AttachmentSummaryList.displayName = 'AttachmentSummaryList';
