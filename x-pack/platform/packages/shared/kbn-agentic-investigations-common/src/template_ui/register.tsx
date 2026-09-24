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
import { DETAILS_FLYOUT_LABELS } from '../components/details/translations';
import { ConversationTitle } from './conversation_title';
import type { RenderAssignees } from './types';

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
   * When provided, the header renders an interactive assignee picker instead of the read-only
   * avatar stack. Supplied by the caller so the picker can use HTTP hooks and Kibana context
   * unavailable in this package.
   */
  renderAssignees?: RenderAssignees;
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
  name,
  icon,
  renderEscalationModal,
  renderAssignees,
}: RegisterAgenticInvestigationTemplateUIOptions): void => {
  const [overviewTabId] = getInvestigationTabIds(templateId);

  conversationTemplates.registerTab(overviewTabId, ({ attachmentsService }) => ({
    label: DETAILS_FLYOUT_LABELS.tabs.overview,
    content: function OverviewTabContent({ conversation }) {
      return (
        <Suspense fallback={<EuiSkeletonText lines={3} />}>
          <LazyOverviewSlot conversation={conversation} attachmentsService={attachmentsService} />
        </Suspense>
      );
    },
  }));

  conversationTemplates.registerTemplateUIDefinition(
    templateId,
    ({ openFullscreenConversation }) => ({
      name,
      icon,
      tabs: [overviewTabId],
      detailsFlyout: {
        header: function InvestigationFlyoutHeader({ conversation, refetchConversation }) {
          return (
            // Agent Builder points the flyout's `aria-labelledby` at the header, so it must not
            // collapse to nothing while the slot's chunk loads.
            <Suspense fallback={<ConversationTitle title={conversation.title} />}>
              <LazyHeaderSlot
                conversation={conversation}
                renderAssignees={renderAssignees}
                refetchConversation={refetchConversation}
              />
            </Suspense>
          );
        },
        footer: function InvestigationFlyoutFooter({ conversation }) {
          return (
            <Suspense fallback={null}>
              <LazyFooterSlot
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
  /** Localized template display name. */
  name: string;
  icon?: IconType;
  /**
   * When provided, the header renders an interactive assignee picker.
   * See `RegisterAgenticInvestigationTemplateUIOptions.renderAssignees`.
   */
  renderAssignees?: RenderAssignees;
}

/**
 * Registers the escalation conversation details flyout UI.
 *
 * Unlike investigations the escalation flyout has no tabs and no footer: its header shows the
 * title, the status badge and the assignee picker. The body is empty, which Agent Builder renders
 * as a blank `EuiFlyoutBody`.
 *
 * Call once from the plugin's `start`, **after** `registerAgenticInvestigationTemplateUI`.
 * Agent Builder throws if the template id is already registered.
 */
export const registerEscalationTemplateUI = ({
  conversationTemplates,
  templateId,
  name,
  icon,
  renderAssignees,
}: RegisterEscalationTemplateUIOptions): void => {
  conversationTemplates.registerTemplateUIDefinition(templateId, () => ({
    name,
    icon,
    // No tabs: the body is intentionally empty for this MVP.
    tabs: [],
    detailsFlyout: {
      header: function EscalationFlyoutHeaderWrapper({ conversation, refetchConversation }) {
        return (
          <Suspense fallback={<ConversationTitle title={conversation.title} />}>
            <LazyEscalationHeaderSlot
              conversation={conversation}
              renderAssignees={renderAssignees}
              refetchConversation={refetchConversation}
            />
          </Suspense>
        );
      },
      // No footer for escalations yet.
    },
  }));
};
