/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { Investigation } from '../../types';
import type { FlyoutGroupedAttachmentsRegistry } from '../grouped_attachments';
import { DetailsBlock } from './detail_block';
import { ImpactSection } from './impact_section';
import { DETAILS_FLYOUT_LABELS } from './translations';
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
    return (
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem grow={false}>
          <WhatsHappenedBlock
            summary={investigation.summary}
            attachments={attachments}
            groupedAttachments={groupedAttachments}
          />
        </EuiFlexItem>

        <ImpactSection attachments={attachments} />

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
