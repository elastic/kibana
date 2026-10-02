/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { Investigation } from '../../types';
import { DetailsBlock } from './detail_block';
import { DETAILS_FLYOUT_LABELS } from './translations';
import { AttachmentsSection } from '../attachments_section';

const SUMMARY_LIMIT = 120;

export interface OverviewTabProps {
  investigation: Investigation;
  attachments: VersionedAttachment[] | undefined;
  /**
   * When provided, visible attachments whose type registers `renderConversationDetailsContent`
   * are shown as pills inside the "What's happened" block.
   */
  attachmentsService?: AttachmentServiceStartContract;
  /**
   * Rendered under a "Proposed actions" heading when supplied. Omitted entirely otherwise: this
   * package cannot fetch a conversation's proposals itself, so a host that can (see
   * `renderProposedActions` on `registerAgenticInvestigationTemplateUI`) owns both the fetch and
   * what appears while it is empty or loading.
   */
  proposedActionsContent?: React.ReactNode;
}

export const OverviewTab = memo<OverviewTabProps>(
  ({ investigation, attachments, attachmentsService, proposedActionsContent }) => {
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
              {attachmentsService && (
                <>
                  <EuiSpacer size={isCondensed ? 'xs' : 'l'} />
                  <AttachmentsSection
                    attachments={attachments}
                    attachmentsService={attachmentsService}
                  />
                </>
              )}
            </DetailsBlock>
          </EuiFlexItem>
        )}

        {proposedActionsContent && (
          <EuiFlexItem>
            <DetailsBlock title={DETAILS_FLYOUT_LABELS.sections.proposedActions}>
              {proposedActionsContent}
            </DetailsBlock>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);
OverviewTab.displayName = 'OverviewTab';
