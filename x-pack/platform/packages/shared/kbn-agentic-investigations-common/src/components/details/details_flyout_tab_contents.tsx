/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownFormat,
  EuiText,
} from '@elastic/eui';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { Investigation } from '../../types';
import { FlyoutGroupedAttachments, GroupedAttachmentsSection } from '../grouped_attachments';
import type { FlyoutGroupedAttachmentsRegistry } from '../grouped_attachments';
import { DetailsBlock } from './detail_block';
import { ImpactSection } from './impact_section';
import { DETAILS_FLYOUT_LABELS } from './translations';
import { OVERVIEW_SECTION_LABELS } from './overview_translations';

const SUMMARY_LIMIT = 120;

const GROUPED_ATTACHMENTS_ORDER: readonly FlyoutGroupedAttachments[] = [
  FlyoutGroupedAttachments.ALERTS,
  FlyoutGroupedAttachments.ATTACKS,
  FlyoutGroupedAttachments.RULES,
  FlyoutGroupedAttachments.TIMELINE,
  FlyoutGroupedAttachments.IOCS,
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
  /**
   * Sections a host renders from investigation data this package cannot fetch. Each one renders
   * only when supplied, so an investigation without that data simply lacks the section.
   */
  sections?: OverviewSections;
  /** Shown beside the "Proposed actions" heading; owned by the same host as the content. */
  proposedActionsCount?: React.ReactNode;
}

/** Host-rendered overview sections, in the order the tab shows them. */
export interface OverviewSections {
  /** What the investigation is about. Shown above the subject attachments. */
  subjects?: React.ReactNode;
  /**
   * Replaces the impact read from the conversation's `investigation_impact` attachment, for a
   * host that reads fresher impact itself. Absent, the tab renders the attachment.
   */
  impact?: React.ReactNode;
  /** The conclusion, as markdown. */
  conclusion?: string;
  /** How the investigation got there: hypotheses and their evidence. */
  trace?: React.ReactNode;
}

export const OverviewTab = memo<OverviewTabProps>(
  ({
    investigation,
    attachments,
    groupedAttachments,
    proposedActionsContent,
    proposedActionsCount,
    sections = {},
  }) => {
    const { summary } = investigation;
    const { subjects, impact, conclusion, trace } = sections;
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
        {subjects && (
          <EuiFlexItem data-test-subj="investigationOverviewSubjects">
            <DetailsBlock title={OVERVIEW_SECTION_LABELS.subjects}>{subjects}</DetailsBlock>
          </EuiFlexItem>
        )}

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

        {impact ? (
          <EuiFlexItem data-test-subj="investigationOverviewImpact">
            <DetailsBlock title={DETAILS_FLYOUT_LABELS.sections.impact}>{impact}</DetailsBlock>
          </EuiFlexItem>
        ) : (
          <ImpactSection attachments={attachments} />
        )}

        {conclusion && (
          <EuiFlexItem data-test-subj="investigationOverviewConclusion">
            <DetailsBlock title={DETAILS_FLYOUT_LABELS.sections.conclusion}>
              <EuiMarkdownFormat textSize="s">{conclusion}</EuiMarkdownFormat>
            </DetailsBlock>
          </EuiFlexItem>
        )}

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

        {trace && (
          <EuiFlexItem data-test-subj="investigationOverviewTrace">
            <DetailsBlock title={OVERVIEW_SECTION_LABELS.trace}>{trace}</DetailsBlock>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);
OverviewTab.displayName = 'OverviewTab';
