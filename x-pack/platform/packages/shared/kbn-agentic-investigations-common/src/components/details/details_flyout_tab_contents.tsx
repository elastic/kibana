/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiMarkdownFormat, EuiSpacer } from '@elastic/eui';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { Investigation } from '../../types';
import type { FlyoutGroupedAttachmentsRegistry } from '../grouped_attachments';
import { DetailsBlock } from './detail_block';
import { ImpactSection } from './impact_section';
import { DETAILS_FLYOUT_LABELS } from './translations';
import { OVERVIEW_SECTION_LABELS } from './overview_translations';
import { WhatsHappenedBlock } from './whats_happened_block';

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
  /**
   * How the investigation got there, such as an entry point to its hypotheses. Shown right under
   * the conclusion, in its section, or on its own while there is no conclusion yet.
   */
  reasoning?: React.ReactNode;
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
    const { subjects, impact, conclusion, reasoning } = sections;

    return (
      <EuiFlexGroup direction="column" gutterSize="m">
        {subjects && (
          <EuiFlexItem data-test-subj="investigationOverviewSubjects">
            <DetailsBlock title={OVERVIEW_SECTION_LABELS.subjects}>{subjects}</DetailsBlock>
          </EuiFlexItem>
        )}

        <EuiFlexItem grow={false}>
          <WhatsHappenedBlock
            summary={investigation.summary}
            attachments={attachments}
            groupedAttachments={groupedAttachments}
          />
        </EuiFlexItem>

        {impact ? (
          <EuiFlexItem data-test-subj="investigationOverviewImpact">
            <DetailsBlock title={DETAILS_FLYOUT_LABELS.sections.impact}>{impact}</DetailsBlock>
          </EuiFlexItem>
        ) : (
          <ImpactSection attachments={attachments} />
        )}

        {conclusion ? (
          <EuiFlexItem data-test-subj="investigationOverviewConclusion">
            <DetailsBlock title={DETAILS_FLYOUT_LABELS.sections.conclusion}>
              <EuiMarkdownFormat textSize="s">{conclusion}</EuiMarkdownFormat>
              {reasoning && (
                <>
                  <EuiSpacer size="m" />
                  <div data-test-subj="investigationOverviewReasoning">{reasoning}</div>
                </>
              )}
            </DetailsBlock>
          </EuiFlexItem>
        ) : (
          reasoning && (
            <EuiFlexItem grow={false} data-test-subj="investigationOverviewReasoning">
              {reasoning}
            </EuiFlexItem>
          )
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
      </EuiFlexGroup>
    );
  }
);
OverviewTab.displayName = 'OverviewTab';
