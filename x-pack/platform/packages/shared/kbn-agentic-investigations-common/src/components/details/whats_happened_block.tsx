/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import { EuiButtonEmpty, EuiText } from '@elastic/eui';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import {
  FLYOUT_GROUPED_ATTACHMENTS_ORDER,
  GroupedAttachmentsSection,
  selectGroupedAttachments,
} from '../grouped_attachments';
import type { FlyoutGroupedAttachmentsRegistry } from '../grouped_attachments';
import { DetailsBlock } from './detail_block';
import { DETAILS_FLYOUT_LABELS } from './translations';

const SUMMARY_LIMIT = 120;

export interface WhatsHappenedBlockProps {
  summary?: string;
  attachments: VersionedAttachment[] | undefined;
  groupedAttachments: FlyoutGroupedAttachmentsRegistry;
}

/** The summary and the grouped attachments card; renders nothing when there is neither. */
export const WhatsHappenedBlock = memo<WhatsHappenedBlockProps>(
  ({ summary, attachments, groupedAttachments }) => {
    const [expanded, setExpanded] = useState(false);

    const hasAttachments =
      selectGroupedAttachments(attachments, groupedAttachments, FLYOUT_GROUPED_ATTACHMENTS_ORDER)
        .length > 0;

    if (!summary && !hasAttachments) {
      return null;
    }

    const isCondensed = summary != null && summary.length > SUMMARY_LIMIT;
    const displayedSummary =
      isCondensed && !expanded ? `${summary.slice(0, SUMMARY_LIMIT)}...` : summary;

    return (
      <DetailsBlock title={DETAILS_FLYOUT_LABELS.sections.overview}>
        {summary && (
          <EuiText size="s" color="subdued">
            <p>{displayedSummary}</p>
          </EuiText>
        )}
        {isCondensed && (
          <div>
            <EuiButtonEmpty size="s" flush="left" onClick={() => setExpanded((prev) => !prev)}>
              {expanded
                ? DETAILS_FLYOUT_LABELS.overview.showLess
                : DETAILS_FLYOUT_LABELS.overview.showMore}
            </EuiButtonEmpty>
          </div>
        )}
        <GroupedAttachmentsSection
          attachments={attachments}
          registry={groupedAttachments}
          order={FLYOUT_GROUPED_ATTACHMENTS_ORDER}
        />
      </DetailsBlock>
    );
  }
);

WhatsHappenedBlock.displayName = 'WhatsHappenedBlock';
