/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { Investigation } from '../../types';
import { FlyoutGroupedAttachments, GroupedAttachmentsSection } from '../grouped_attachments';
import type { FlyoutGroupedAttachmentsRegistry } from '../grouped_attachments';
import { DetailsBlock } from './detail_block';
import { DETAILS_FLYOUT_LABELS } from './translations';

const SUMMARY_LIMIT = 120;

const GROUPED_ATTACHMENTS_ORDER: readonly FlyoutGroupedAttachments[] = [
  FlyoutGroupedAttachments.ALERTS,
  FlyoutGroupedAttachments.ATTACKS,
  FlyoutGroupedAttachments.RULES,
];

export interface OverviewTabProps {
  investigation: Investigation;
  attachments: VersionedAttachment[] | undefined;
  groupedAttachments: FlyoutGroupedAttachmentsRegistry;
  /**
   * Rendered under a "Proposed actions" heading when supplied. Omitted entirely otherwise: this
   * package cannot fetch a conversation's proposals itself, so a host that can (see
   * `renderProposedActions` on `registerAgenticInvestigationTemplateUI`) owns both the fetch and
   * what appears while it is empty or loading.
   */
  proposedActionsContent?: React.ReactNode;
  /** Shown beside the "Proposed actions" heading; owned by the same host as the content. */
  proposedActionsCount?: React.ReactNode;
}

export const OverviewTab = memo<OverviewTabProps>(
  ({
    investigation,
    attachments,
    groupedAttachments,
    proposedActionsContent,
    proposedActionsCount,
  }) => {
    const { summary } = investigation;
    const [expanded, setExpanded] = useState(false);

    const isCondensed = summary != null && summary.length > SUMMARY_LIMIT;
    const displayedSummary =
      isCondensed && !expanded ? `${summary.slice(0, SUMMARY_LIMIT)}...` : summary;

    const attachmentsSection = (
      <GroupedAttachmentsSection
        attachments={attachments}
        registry={groupedAttachments}
        order={GROUPED_ATTACHMENTS_ORDER}
      />
    );

    return (
      <EuiFlexGroup direction="column" gutterSize="m">
        {summary && (
          <EuiFlexItem>
            <DetailsBlock title={DETAILS_FLYOUT_LABELS.sections.overview}>
              <EuiText size="s" color="subdued">
                <p>{displayedSummary}</p>
              </EuiText>
              {isCondensed && (
                <div>
                  <EuiButtonEmpty
                    size="s"
                    flush="left"
                    onClick={() => setExpanded((prev) => !prev)}
                  >
                    {expanded
                      ? DETAILS_FLYOUT_LABELS.overview.showLess
                      : DETAILS_FLYOUT_LABELS.overview.showMore}
                  </EuiButtonEmpty>
                </div>
              )}
              {attachmentsSection}
            </DetailsBlock>
          </EuiFlexItem>
        )}

        {!summary && attachmentsSection}

        {proposedActionsContent && (
          <EuiFlexItem>
            <DetailsBlock
              title={DETAILS_FLYOUT_LABELS.sections.proposedActions}
              titleAppend={proposedActionsCount}
            >
              {proposedActionsContent}
            </DetailsBlock>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);
OverviewTab.displayName = 'OverviewTab';
