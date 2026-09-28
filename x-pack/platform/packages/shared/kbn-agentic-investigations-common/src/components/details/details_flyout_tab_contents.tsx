/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useState } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { Investigation } from '../../types';
import { AttachmentSummarySection } from '../attachment_summary';
import { ImpactEntityChips } from '../impact/impact_entity_chips';
import { selectImpactEntities, type OpenImpactEntity } from '../impact/impact_entities';
import { IMPACT_LABELS } from '../impact/translations';
import { DetailsBlock } from './detail_block';
import { DETAILS_FLYOUT_LABELS } from './translations';

const SUMMARY_LIMIT = 120;

export interface OverviewTabProps {
  investigation: Investigation;
  attachments: VersionedAttachment[] | undefined;
  attachmentsService: AttachmentServiceStartContract;
  /**
   * Rendered under a "Proposed actions" heading when supplied. Omitted entirely otherwise: this
   * package cannot fetch a conversation's proposals itself, so a host that can (see
   * `renderProposedActions` on `registerAgenticInvestigationTemplateUI`) owns both the fetch and
   * what appears while it is empty or loading.
   */
  proposedActionsContent?: React.ReactNode;
  /**
   * Opens an entity-store Impact chip. Knowledge-indicator chips stay plain text, matching the
   * Attachments tab.
   */
  onOpenImpactEntity?: OpenImpactEntity;
}

export const OverviewTab = memo<OverviewTabProps>(
  ({
    investigation,
    attachments,
    attachmentsService,
    proposedActionsContent,
    onOpenImpactEntity,
  }) => {
    const { summary } = investigation;
    const [expanded, setExpanded] = useState(false);
    const impactEntities = useMemo(() => selectImpactEntities(attachments), [attachments]);

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

        {impactEntities.length > 0 && (
          <EuiFlexItem>
            <DetailsBlock title={IMPACT_LABELS.groupTitle}>
              <ImpactEntityChips
                entities={impactEntities}
                onOpenImpactEntity={onOpenImpactEntity}
              />
            </DetailsBlock>
          </EuiFlexItem>
        )}

        {/* Not wrapped in an EuiFlexItem: the section renders nothing when the investigation has
            no listable attachment, and an empty item would still take a gutter. */}
        <AttachmentSummarySection
          attachments={attachments}
          attachmentsService={attachmentsService}
        />

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
