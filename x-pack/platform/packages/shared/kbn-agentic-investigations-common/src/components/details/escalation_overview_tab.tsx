/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { FlyoutGroupedAttachmentsRegistry } from '../grouped_attachments';
import { WhatsHappenedBlock } from './whats_happened_block';

export interface EscalationOverviewTabProps {
  summary?: string;
  attachments: VersionedAttachment[] | undefined;
  groupedAttachments: FlyoutGroupedAttachmentsRegistry;
  /** Rendered below the summary and attachments; owned by the host that fetches the list. */
  linkedInvestigationsContent?: React.ReactNode;
}

export const EscalationOverviewTab = memo<EscalationOverviewTabProps>(
  ({ summary, attachments, groupedAttachments, linkedInvestigationsContent }) => (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="escalationOverviewTab">
      <EuiFlexItem grow={false}>
        <WhatsHappenedBlock
          summary={summary}
          attachments={attachments}
          groupedAttachments={groupedAttachments}
        />
      </EuiFlexItem>
      {linkedInvestigationsContent && (
        <EuiFlexItem grow={false}>{linkedInvestigationsContent}</EuiFlexItem>
      )}
    </EuiFlexGroup>
  )
);

EscalationOverviewTab.displayName = 'EscalationOverviewTab';
