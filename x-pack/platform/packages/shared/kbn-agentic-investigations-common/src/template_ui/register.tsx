/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, lazy } from 'react';
import type { IconType } from '@elastic/eui';
import { EuiSkeletonText } from '@elastic/eui';
import type {
  ConversationTemplateBriefCardRenderProps,
  ConversationTemplateServiceStartContract,
} from '@kbn/agent-builder-browser';
import { getCopyLinkFlyoutAction } from '../components/actions/copy_link_action';
import { DETAILS_FLYOUT_LABELS } from '../components/details/translations';
import type { EscalationModalRenderProps } from '../components/modals/investigation_action_modals';
import type { FlyoutGroupedAttachmentsRegistry } from '../components/grouped_attachments';
import type {
  EscalationDetailsFlyoutContext,
  InvestigationDetailsFlyoutContext,
  RenderAssignees,
  RenderStatus,
  RenderSeverity,
  RenderLinkedInvestigations,
  RenderOverview,
  RenderLiveState,
} from './types';

/**
 * The slot contents are loaded on demand: registration runs during every consuming plugin's
 * `start`, so anything this module imports statically lands in that plugin's page load bundle.
 * All share one chunk, which the first opened flyout pulls in.
 */
const LazyOverviewSlot = lazy(() =>
  import('./slots').then(({ OverviewSlot }) => ({ default: OverviewSlot }))
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
   * When provided, the flyout footer offers "Open an escalation" as its primary action and renders
   * the modal with this. Supplied by the caller so the modal can use Kibana HTTP hooks unavailable
   * in this package. `loadDetailsFlyoutContext` can hide the action from a user who may not
   * escalate.
   */
  renderEscalationModal?: (props: EscalationModalRenderProps) => React.ReactNode;
  /**
   * Loads the provider and hooks the caller adds to the details flyout, such as the privilege
   * check for "Open an escalation". Called with the flyout's own module, the first time a flyout
   * opens.
   */
  loadDetailsFlyoutContext?: () => Promise<InvestigationDetailsFlyoutContext>;
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
   * When provided, the header renders an interactive severity picker beside status and
   * assignees. Supplied by the caller so the picker can use HTTP hooks unavailable here.
   */
  renderSeverity?: RenderSeverity;
  /**
   * When provided, replaces the overview tab body so the caller can add sections from data it
   * fetches. See `RenderOverview`.
   */
  renderOverview?: RenderOverview;
  /**
   * When provided, the header shows the investigation's live state (severity, running indicator)
   * next to its age. See `RenderLiveState`.
   */
  renderLiveState?: RenderLiveState;
  /**
   * Card Agent Builder renders for conversations on this template. Must be self-contained; see
   * `ConversationTemplateUIDefinition.briefCard`.
   */
  briefCard?: React.ComponentType<ConversationTemplateBriefCardRenderProps>;
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
  loadDetailsFlyoutContext,
  renderProposedActions,
  renderProposedActionsCount,
  renderAssignees,
  renderStatus,
  renderSeverity,
  renderOverview,
  renderLiveState,
  briefCard,
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
            renderOverview={renderOverview}
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
      ...(briefCard && { briefCard }),
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
        load: async () => {
          const [{ createInvestigationDetailsFlyoutModule }, context] = await Promise.all([
            import('./details_flyout'),
            loadDetailsFlyoutContext?.(),
          ]);
          return createInvestigationDetailsFlyoutModule({
            renderAssignees,
            renderStatus,
            renderSeverity,
            renderLiveState,
            // Full screen rather than the sidebar: the chat is the investigation's own record, so it
            // gets the whole page instead of a panel beside the flyout that opened it. The
            // conversation list is collapsed so the investigation's chat gets the width.
            onOpenChat: ({ conversationId, agentId }) =>
              openFullscreenConversation({
                conversationId,
                agentId,
                openDetails: true,
                collapseSidebar: true,
              }),
            renderEscalationModal,
            context,
          });
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
   * Loads the provider and hooks the caller adds to the details flyout, such as the attachment
   * sync the header shows a spinner for. Called with the flyout's own module, the first time a
   * flyout opens.
   */
  loadDetailsFlyoutContext?: () => Promise<EscalationDetailsFlyoutContext>;
  /**
   * Called by the flyout's "Copy link" button with the conversation's Agent Builder URL.
   * See `RegisterAgenticInvestigationTemplateUIOptions.onCopyLink`.
   */
  onCopyLink: (url: string) => boolean;
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
  loadDetailsFlyoutContext,
  onCopyLink,
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

  conversationTemplates.registerTemplateUIDefinition(templateId, ({ getConversationUrl }) => ({
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
      load: async () => {
        const [{ createEscalationDetailsFlyoutModule }, context] = await Promise.all([
          import('./details_flyout'),
          loadDetailsFlyoutContext?.(),
        ]);
        return createEscalationDetailsFlyoutModule({ renderAssignees, renderStatus, context });
      },
      // No footer for escalations yet.
    },
  }));
};
