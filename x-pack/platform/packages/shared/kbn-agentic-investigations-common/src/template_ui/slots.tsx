/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSkeletonRectangle, EuiSkeletonTitle } from '@elastic/eui';
import type { Conversation } from '@kbn/agent-builder-common';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import {
  ConversationDetailsFlyoutHeader,
  ConversationDetailsFlyoutFooter,
  AttachmentsTab,
  OverviewTab,
  TimelineTab,
} from '../components/details';
import { ConversationTitle } from './conversation_title';
import { InvestigationSlot, type InvestigationLoader } from './investigation_slot';

/**
 * The investigation flyout's slot contents, kept in one module so `register` can pull them in a
 * single lazy chunk instead of shipping them in each consuming plugin's page load bundle.
 */
interface InvestigationSlotProps {
  conversation: Conversation;
  loadInvestigation: InvestigationLoader;
}

export const OverviewSlot = ({ conversation, loadInvestigation }: InvestigationSlotProps) => (
  <InvestigationSlot conversation={conversation} loadInvestigation={loadInvestigation}>
    {(investigation) => <OverviewTab investigation={investigation} />}
  </InvestigationSlot>
);

export const TimelineSlot = ({ conversation, loadInvestigation }: InvestigationSlotProps) => (
  <InvestigationSlot conversation={conversation} loadInvestigation={loadInvestigation}>
    {(investigation) => <TimelineTab events={investigation.events} />}
  </InvestigationSlot>
);

export interface AttachmentsSlotProps {
  conversation: Conversation;
  attachmentsService: AttachmentServiceStartContract;
}

export const AttachmentsSlot = ({ conversation, attachmentsService }: AttachmentsSlotProps) => (
  <AttachmentsTab conversation={conversation} attachmentsService={attachmentsService} />
);

export const HeaderSlot = ({ conversation, loadInvestigation }: InvestigationSlotProps) => (
  <InvestigationSlot
    conversation={conversation}
    loadInvestigation={loadInvestigation}
    // Agent Builder points the flyout's `aria-labelledby` at the header, so it must not collapse
    // to nothing when the investigation is unavailable.
    fallback={<ConversationTitle title={conversation.title} />}
    loadingContent={<EuiSkeletonTitle size="s" />}
  >
    {(investigation) => <ConversationDetailsFlyoutHeader investigation={investigation} />}
  </InvestigationSlot>
);

export interface FooterSlotProps extends InvestigationSlotProps {
  onOpenChat: () => void;
}

export const FooterSlot = ({ conversation, loadInvestigation, onOpenChat }: FooterSlotProps) => (
  <InvestigationSlot
    conversation={conversation}
    loadInvestigation={loadInvestigation}
    fallback={null}
    // The footer is a right-aligned row of buttons, so it skeletons as one button-sized block.
    loadingContent={
      <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiSkeletonRectangle width={110} height={32} borderRadius="m" />
        </EuiFlexItem>
      </EuiFlexGroup>
    }
  >
    {(investigation) => (
      <ConversationDetailsFlyoutFooter investigation={investigation} onOpenChat={onOpenChat} />
    )}
  </InvestigationSlot>
);
