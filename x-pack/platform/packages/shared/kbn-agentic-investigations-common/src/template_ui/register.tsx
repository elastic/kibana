/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { IconType } from '@elastic/eui';
import { EuiTitle } from '@elastic/eui';
import type {
  ConversationTemplateDetailsFlyoutRenderProps,
  ConversationTemplateServiceStartContract,
} from '@kbn/agent-builder-browser';
import { ConversationDetailsFlyoutHeader } from '../components/details/flyout_header';
import { ConversationDetailsFlyoutFooter } from '../components/details/flyout_footer';
import {
  AttachmentsTab,
  OverviewTab,
  TimelineTab,
} from '../components/details/details_flyout_tab_contents';
import { DETAILS_FLYOUT_LABELS } from '../components/details/translations';
import { InvestigationSlot } from './investigation_slot';
import { setTemplateBindings } from './template_bindings';
import type { InvestigationLoader, MetadataPatcher } from './template_bindings';
import {
  AGENTIC_INVESTIGATIONS_ATTACHMENTS_TAB_ID,
  AGENTIC_INVESTIGATIONS_DEFAULT_TAB_IDS,
  AGENTIC_INVESTIGATIONS_OVERVIEW_TAB_ID,
  AGENTIC_INVESTIGATIONS_TIMELINE_TAB_ID,
} from './constants';

/** Statuses offered by the header's status menu when a solution does not supply its own. */
export const DEFAULT_INVESTIGATION_STATUS_OPTIONS: readonly string[] = [
  'open',
  'investigating',
  'escalated',
  'closed',
];

export interface RegisterAgenticInvestigationTemplateUIOptions {
  conversationTemplates: ConversationTemplateServiceStartContract;
  /** Solution-owned conversation template id. Must be unique across solutions. */
  templateId: string;
  /** Localized template display name, shown in Agent Builder's title badge. */
  name: string;
  icon?: IconType;
  loadInvestigation: InvestigationLoader;
  /** Omit to render the header's status and assignee read-only. */
  patchMetadata?: MetadataPatcher;
  statusOptions?: readonly string[];
  /** Defaults to the overview, attachments and timeline tabs, in that order. */
  tabs?: readonly string[];
}

const OverviewTabContent = ({ conversation }: ConversationTemplateDetailsFlyoutRenderProps) => (
  <InvestigationSlot conversation={conversation}>
    {(investigation) => <OverviewTab investigation={investigation} />}
  </InvestigationSlot>
);

const TimelineTabContent = ({ conversation }: ConversationTemplateDetailsFlyoutRenderProps) => (
  <InvestigationSlot conversation={conversation}>
    {(investigation) => <TimelineTab events={investigation.events} />}
  </InvestigationSlot>
);

/**
 * Agent Builder throws on duplicate tab ids, so the shared tabs are registered at most once per
 * service instance no matter how many solutions register a template.
 */
const contractsWithRegisteredTabs = new WeakSet<ConversationTemplateServiceStartContract>();

const ensureTabsRegistered = (
  conversationTemplates: ConversationTemplateServiceStartContract
): void => {
  if (contractsWithRegisteredTabs.has(conversationTemplates)) {
    return;
  }
  contractsWithRegisteredTabs.add(conversationTemplates);

  conversationTemplates.registerTab(AGENTIC_INVESTIGATIONS_OVERVIEW_TAB_ID, () => ({
    label: DETAILS_FLYOUT_LABELS.tabs.overview,
    content: OverviewTabContent,
  }));

  conversationTemplates.registerTab(
    AGENTIC_INVESTIGATIONS_ATTACHMENTS_TAB_ID,
    ({ attachmentsService }) => ({
      label: DETAILS_FLYOUT_LABELS.tabs.attachments,
      // Defined here so the service is captured once, at registration.
      content: function AttachmentsTabContent({ conversation }) {
        return (
          <AttachmentsTab conversation={conversation} attachmentsService={attachmentsService} />
        );
      },
    })
  );

  conversationTemplates.registerTab(AGENTIC_INVESTIGATIONS_TIMELINE_TAB_ID, () => ({
    label: DETAILS_FLYOUT_LABELS.tabs.timeline,
    content: TimelineTabContent,
  }));
};

/**
 * Registers the shared agentic investigation flyout tabs and one solution's template UI.
 *
 * Call once per solution from the plugin's `start`, passing the solution's own `templateId` and
 * investigation loader.
 */
export const registerAgenticInvestigationTemplateUI = ({
  conversationTemplates,
  templateId,
  name,
  icon,
  loadInvestigation,
  patchMetadata,
  statusOptions = DEFAULT_INVESTIGATION_STATUS_OPTIONS,
  tabs = AGENTIC_INVESTIGATIONS_DEFAULT_TAB_IDS,
}: RegisterAgenticInvestigationTemplateUIOptions): void => {
  setTemplateBindings(templateId, { loadInvestigation, patchMetadata });
  ensureTabsRegistered(conversationTemplates);

  conversationTemplates.registerTemplateUIDefinition(templateId, ({ openSidebarConversation }) => ({
    name,
    icon,
    tabs,
    detailsFlyout: {
      header: function InvestigationFlyoutHeader({ conversation }) {
        return (
          <InvestigationSlot
            conversation={conversation}
            compact
            // Keeps the flyout's `aria-labelledby` target populated when the load fails.
            fallback={
              <EuiTitle size="s">
                <h2>{conversation.title}</h2>
              </EuiTitle>
            }
          >
            {(investigation, refresh) => (
              <ConversationDetailsFlyoutHeader
                investigation={investigation}
                statusOptions={statusOptions}
                // Refreshing on rejection too: either way the server is the source of truth
                // for what the tile should show next.
                onChangeStatus={
                  patchMetadata &&
                  ((status) => {
                    patchMetadata(conversation.id, { status }).then(refresh, refresh);
                  })
                }
                onChangeAssignee={
                  patchMetadata &&
                  ((assignee) => {
                    patchMetadata(conversation.id, { assignees: [assignee] }).then(
                      refresh,
                      refresh
                    );
                  })
                }
              />
            )}
          </InvestigationSlot>
        );
      },
      footer: function InvestigationFlyoutFooter({ conversation }) {
        return (
          <InvestigationSlot conversation={conversation} compact>
            {(investigation) => (
              <ConversationDetailsFlyoutFooter
                investigation={investigation}
                onOpenChat={() => openSidebarConversation(conversation.id)}
              />
            )}
          </InvestigationSlot>
        );
      },
    },
  }));
};
