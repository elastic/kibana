/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, lazy } from 'react';
import type { IconType } from '@elastic/eui';
import { EuiSkeletonText } from '@elastic/eui';
import type { ConversationTemplateServiceStartContract } from '@kbn/agent-builder-browser';
import { getCopyLinkFlyoutAction } from '../components/actions/copy_link_action';
import { DETAILS_FLYOUT_LABELS } from '../components/details/translations';
import type { FlyoutGroupedAttachmentsRegistry } from '../components/grouped_attachments';
import { ConversationTitle } from './conversation_title';
import type {
  RenderAssignees,
  RenderStatus,
  RenderLinkedInvestigations,
  RenderSyncIndicator,
} from './types';

/**
 * The slot contents are loaded on demand: registration runs during every consuming plugin's
 * `start`, so anything this module imports statically lands in that plugin's page load bundle.
 * All share one chunk, which the first opened flyout pulls in.
 */
const LazyOverviewSlot = lazy(() =>
  import('./slots').then(({ OverviewSlot }) => ({ default: OverviewSlot }))
);
const LazyHeaderSlot = lazy(() =>
  import('./slots').then(({ HeaderSlot }) => ({ default: HeaderSlot }))
);
const LazyFooterSlot = lazy(() =>
  import('./slots').then(({ FooterSlot }) => ({ default: FooterSlot }))
);
const LazyEscalationHeaderSlot = lazy(() =>
  import('./slots').then(({ EscalationHeaderSlot }) => ({ default: EscalationHeaderSlot }))
);
const LazyEscalationOverviewSlot = lazy(() =>
  import('./slots').then(({ EscalationOverviewSlot }) => ({ default: EscalationOverviewSlot }))
);

/**
 * Tab ids are prefixed with the solution's template id because Agent Builder's tab ids are a
 * global keyspace and duplicate registration throws.
 */
export const getInvestigationTabIds = (templateId: string): readonly string[] => [
  `${templateId}.overview`,
];

export interface RegisterAgenticInvestigationTemplateUIOptions {
  conversationTemplates: ConversationTemplateServiceStartContract;
  /** Solution-owned conversation template id. Agent Builder throws if it is already registered. */
  templateId: string;
  groupedAttachments: FlyoutGroupedAttachmentsRegistry;
  /** Localized template display name, shown in Agent Builder's title badge. */
  name: string;
  icon?: IconType;
  /**
   * When provided, the flyout footer renders a dedicated "Open escalation" primary button and
   * delegates modal rendering to this function. Supplied by the caller so the modal can use
   * Kibana HTTP hooks unavailable in this package.
   */
  renderEscalationModal?: import('./slots').FooterSlotProps['onOpenEscalation'];
  /**
   * Wraps the footer's "Open escalation" button, so the caller can hide it once it learns at
   * render time (for example from a privileges request) that the user may not escalate.
   */
  wrapEscalationButton?: import('./slots').FooterSlotProps['wrapEscalationButton'];
  /**
   * When provided, the overview tab renders a "Proposed actions" section with this as its
   * content. Supplied by the caller because listing and deciding a conversation's proposals
   * needs Kibana HTTP hooks unavailable in this package.
   */
  renderProposedActions?: import('./slots').OverviewSlotProps['renderProposedActions'];
  /** Count shown beside the "Proposed actions" heading. */
  renderProposedActionsCount?: import('./slots').OverviewSlotProps['renderProposedActionsCount'];
  /**
   * When provided, the header renders an interactive assignee picker instead of the read-only
   * avatar stack. Supplied by the caller so the picker can use HTTP hooks and Kibana context
   * unavailable in this package.
   */
  renderAssignees?: RenderAssignees;
  /**
   * When provided, the header renders an interactive status toggle instead of the read-only
   * status badge. Supplied by the caller so the toggle can use HTTP hooks unavailable here.
   */
  renderStatus?: RenderStatus;
  /**
   * When provided, the "Close investigation" footer action renders a confirmation modal.
   * Supplied by the caller so the modal can use HTTP hooks unavailable in this package.
   */
  renderCloseInvestigationModal?: import('./slots').FooterSlotProps['onCloseInvestigation'];
  /**
   * Called by the in-chat flyout's "Copy link" button with the conversation's Agent Builder URL,
   * which Agent Builder builds. Supplied by the caller, which does the copying. Returns whether it was copied: the button's tooltip confirms success, so the
   * caller only reports a failure.
   */
  onCopyLink: (url: string) => boolean;
}

/**
 * Registers one solution's agentic investigation flyout UI: the overview tab Agent Builder
 * renders, plus the header and footer of its conversation details flyout.
 *
 * Call once per solution from the plugin's `start`. Tabs are registered per template rather than
 * shared, so each solution's tab components stay independent.
 */
export const registerAgenticInvestigationTemplateUI = ({
  conversationTemplates,
  templateId,
  groupedAttachments,
  name,
  icon,
  renderEscalationModal,
  wrapEscalationButton,
  renderProposedActions,
  renderProposedActionsCount,
  renderAssignees,
  renderStatus,
  renderCloseInvestigationModal,
  onCopyLink,
}: RegisterAgenticInvestigationTemplateUIOptions): void => {
  const [overviewTabId] = getInvestigationTabIds(templateId);

  conversationTemplates.registerTab(overviewTabId, () => ({
    label: DETAILS_FLYOUT_LABELS.tabs.overview,
    content: function OverviewTabContent({ conversation }) {
      return (
        <Suspense fallback={<EuiSkeletonText lines={3} />}>
          <LazyOverviewSlot
            conversation={conversation}
            groupedAttachments={groupedAttachments}
            renderProposedActions={renderProposedActions}
            renderProposedActionsCount={renderProposedActionsCount}
          />
        </Suspense>
      );
    },
  }));

  conversationTemplates.registerTemplateUIDefinition(
    templateId,
    ({ openFullscreenConversation, getConversationUrl }) => ({
      name,
      icon,
      tabs: [overviewTabId],
      detailsFlyout: {
        trailingActions: ({ conversation }) => [
          getCopyLinkFlyoutAction(() =>
            onCopyLink(
              getConversationUrl({
                conversationId: conversation.id,
                agentId: conversation.agent_id,
                openDetails: true,
              })
            )
          ),
        ],
        header: function InvestigationFlyoutHeader({ conversation, refetchConversation }) {
          return (
            // Agent Builder points the flyout's `aria-labelledby` at the header, so it must not
            // collapse to nothing while the slot's chunk loads.
            <Suspense fallback={<ConversationTitle title={conversation.title} />}>
              <LazyHeaderSlot
                conversation={conversation}
                renderAssignees={renderAssignees}
                renderStatus={renderStatus}
                refetchConversation={refetchConversation}
              />
            </Suspense>
          );
        },
        footer: function InvestigationFlyoutFooter({ conversation, isOpenedFromChat }) {
          return (
            <Suspense fallback={null}>
              <LazyFooterSlot
                isOpenedFromChat={isOpenedFromChat}
                conversation={conversation}
                // Full screen rather than the sidebar: the chat is the investigation's own record,
                // so it gets the whole page instead of a panel beside the flyout that opened it.
                onOpenChat={() =>
                  openFullscreenConversation({
                    conversationId: conversation.id,
                    agentId: conversation.agent_id,
                    openDetails: true,
                  })
                }
                onOpenEscalation={renderEscalationModal}
                wrapEscalationButton={wrapEscalationButton}
                onCloseInvestigation={renderCloseInvestigationModal}
              />
            </Suspense>
          );
        },
      },
    })
  );
};

// ---------------------------------------------------------------------------
// Escalation flyout registration
// ---------------------------------------------------------------------------

export interface RegisterEscalationTemplateUIOptions {
  conversationTemplates: ConversationTemplateServiceStartContract;
  /** Escalation template id (typically `'escalation'`). Agent Builder throws on duplicate. */
  templateId: string;
  groupedAttachments: FlyoutGroupedAttachmentsRegistry;
  /** Localized template display name. */
  name: string;
  icon?: IconType;
  /**
   * When provided, the header renders an interactive assignee picker.
   * See `RegisterAgenticInvestigationTemplateUIOptions.renderAssignees`.
   */
  renderAssignees?: RenderAssignees;
  /**
   * When provided, the header renders an interactive status toggle instead of the read-only
   * status badge. Supplied by the caller so the toggle can use HTTP hooks unavailable here.
   */
  renderStatus?: RenderStatus;
  /**
   * When provided, the overview tab body renders the connected linked-investigations list.
   * Supplied by the caller so the list can use Kibana HTTP hooks unavailable in this package.
   */
  renderLinkedInvestigations?: RenderLinkedInvestigations;
  /**
   * When provided, the header renders it beside the title, e.g. a spinner while the escalation's
   * attachments sync. Supplied by the caller so it can use Kibana HTTP hooks and toasts.
   */
  renderSyncIndicator?: RenderSyncIndicator;
}

/** Returns the tab ids registered by the escalation template. */
export const getEscalationTabIds = (templateId: string): readonly string[] => [
  `${templateId}.overview`,
];

/**
 * Registers the escalation conversation details flyout UI.
 *
 * The flyout shows a header (title, status, assignees) and an overview tab with the summary, the
 * grouped attachments and — when `renderLinkedInvestigations` is supplied — the linked
 * investigations. With a single tab Agent Builder hides the tab bar, so it reads as the body.
 *
 * Call once from the plugin's `start`, **after** `registerAgenticInvestigationTemplateUI`.
 * Agent Builder throws if the template id is already registered.
 */
export const registerEscalationTemplateUI = ({
  conversationTemplates,
  templateId,
  groupedAttachments,
  name,
  icon,
  renderAssignees,
  renderStatus,
  renderLinkedInvestigations,
  renderSyncIndicator,
}: RegisterEscalationTemplateUIOptions): void => {
  const [overviewTabId] = getEscalationTabIds(templateId);

  conversationTemplates.registerTab(overviewTabId, ({ openFullscreenConversation }) => ({
    label: DETAILS_FLYOUT_LABELS.tabs.overview,
    content: function EscalationOverviewTabContent({ conversation }) {
      return (
        <Suspense fallback={<EuiSkeletonText lines={3} />}>
          <LazyEscalationOverviewSlot
            conversation={conversation}
            groupedAttachments={groupedAttachments}
            renderLinkedInvestigations={renderLinkedInvestigations}
            onOpenInvestigation={({ conversationId, agentId }) =>
              openFullscreenConversation({ conversationId, agentId, openDetails: true })
            }
          />
        </Suspense>
      );
    },
  }));

  conversationTemplates.registerTemplateUIDefinition(templateId, () => ({
    name,
    icon,
    tabs: [overviewTabId],
    detailsFlyout: {
      header: function EscalationFlyoutHeaderWrapper({ conversation, refetchConversation }) {
        return (
          <Suspense fallback={<ConversationTitle title={conversation.title} />}>
            <LazyEscalationHeaderSlot
              conversation={conversation}
              renderAssignees={renderAssignees}
              renderStatus={renderStatus}
              renderSyncIndicator={renderSyncIndicator}
              refetchConversation={refetchConversation}
            />
          </Suspense>
        );
      },
      // No footer for escalations yet.
    },
  }));
};
