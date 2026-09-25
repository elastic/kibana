/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { Investigation } from '../../types';
import { AttachmentSummarySection } from '../attachment_summary';
import { DetailsBlock } from './detail_block';
import { DETAILS_FLYOUT_LABELS } from './translations';

const SUMMARY_LIMIT = 120;

export interface OverviewTabProps {
  investigation: Investigation;
  attachments: VersionedAttachment[] | undefined;
  attachmentsService: AttachmentServiceStartContract;
}

export const OverviewTab = memo<OverviewTabProps>(
  ({ investigation, attachments, attachmentsService }) => {
    const { summary } = investigation;
    const [expanded, setExpanded] = useState(false);

    const isCondensed = summary != null && summary.length > SUMMARY_LIMIT;
    const displayedSummary =
      isCondensed && !expanded ? `${summary.slice(0, SUMMARY_LIMIT)}...` : summary;

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
            </DetailsBlock>
          </EuiFlexItem>
        )}

        {/* Not wrapped in an EuiFlexItem: the section renders nothing when the investigation has
            no listable attachment, and an empty item would still take a gutter. */}
        <AttachmentSummarySection
          attachments={attachments}
          attachmentsService={attachmentsService}
        />
      </EuiFlexGroup>
    );
  }
);
OverviewTab.displayName = 'OverviewTab';
