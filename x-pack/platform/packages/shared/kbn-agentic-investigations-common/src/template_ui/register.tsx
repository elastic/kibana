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
import type { Investigation } from '../types';
import { DETAILS_FLYOUT_LABELS } from '../components/details/translations';
import { ConversationTitle } from './conversation_title';
import type { InvestigationLoader } from './investigation_slot';

/**
 * The slot contents are loaded on demand: registration runs during every consuming plugin's
 * `start`, so anything this module imports statically lands in that plugin's page load bundle.
 * All five share one chunk, which the first opened flyout pulls in.
 */
const LazyOverviewSlot = lazy(() =>
  import('./slots').then(({ OverviewSlot }) => ({ default: OverviewSlot }))
);
const LazyAttachmentsSlot = lazy(() =>
  import('./slots').then(({ AttachmentsSlot }) => ({ default: AttachmentsSlot }))
);
const LazyTimelineSlot = lazy(() =>
  import('./slots').then(({ TimelineSlot }) => ({ default: TimelineSlot }))
);
const LazyHeaderSlot = lazy(() =>
  import('./slots').then(({ HeaderSlot }) => ({ default: HeaderSlot }))
);
const LazyFooterSlot = lazy(() =>
  import('./slots').then(({ FooterSlot }) => ({ default: FooterSlot }))
);

/**
 * Tab ids are prefixed with the solution's template id because Agent Builder's tab ids are a
 * global keyspace and duplicate registration throws. `timeline` is deliberately not reused: Agent
 * Builder's built-in tab of that name renders chat execution events, not investigation events.
 */
export const getInvestigationTabIds = (templateId: string): readonly string[] => [
  `${templateId}.overview`,
  `${templateId}.attachments`,
  `${templateId}.timeline`,
];

export interface RegisterAgenticInvestigationTemplateUIOptions {
  conversationTemplates: ConversationTemplateServiceStartContract;
  /** Solution-owned conversation template id. Agent Builder throws if it is already registered. */
  templateId: string;
  /** Localized template display name, shown in Agent Builder's title badge. */
  name: string;
  icon?: IconType;
  loadInvestigation: InvestigationLoader;
}

/**
 * Every slot of an open flyout resolves the same investigation, so concurrent loads for one
 * conversation share a request instead of issuing one per slot. Slots mount as the lazy chunk
 * below resolves, so they join whichever request the first of them put in flight.
 */
const shareConcurrentLoads = (load: InvestigationLoader): InvestigationLoader => {
  const inFlight = new Map<string, Promise<Investigation>>();

  return (conversationId) => {
    const pending = inFlight.get(conversationId);
    if (pending) {
      return pending;
    }

    const request = load(conversationId).finally(() => inFlight.delete(conversationId));
    inFlight.set(conversationId, request);
    return request;
  };
};

/**
 * Registers one solution's agentic investigation flyout UI: the tabs Agent Builder renders, plus
 * the header and footer of its conversation details flyout.
 *
 * Call once per solution from the plugin's `start`. Tabs are registered per template rather than
 * shared, so each solution's tab components close over its own investigation loader.
 */
export const registerAgenticInvestigationTemplateUI = ({
  conversationTemplates,
  templateId,
  name,
  icon,
  loadInvestigation,
}: RegisterAgenticInvestigationTemplateUIOptions): void => {
  const load = shareConcurrentLoads(loadInvestigation);
  const [overviewTabId, attachmentsTabId, timelineTabId] = getInvestigationTabIds(templateId);

  conversationTemplates.registerTab(overviewTabId, () => ({
    label: DETAILS_FLYOUT_LABELS.tabs.overview,
    content: function OverviewTabContent({ conversation }) {
      return (
        <Suspense fallback={<EuiSkeletonText lines={3} />}>
          <LazyOverviewSlot conversation={conversation} loadInvestigation={load} />
        </Suspense>
      );
    },
  }));

  conversationTemplates.registerTab(attachmentsTabId, ({ attachmentsService }) => ({
    label: DETAILS_FLYOUT_LABELS.tabs.attachments,
    content: function AttachmentsTabContent({ conversation }) {
      return (
        <Suspense fallback={<EuiSkeletonText lines={3} />}>
          <LazyAttachmentsSlot
            conversation={conversation}
            attachmentsService={attachmentsService}
          />
        </Suspense>
      );
    },
  }));

  conversationTemplates.registerTab(timelineTabId, () => ({
    label: DETAILS_FLYOUT_LABELS.tabs.timeline,
    content: function TimelineTabContent({ conversation }) {
      return (
        <Suspense fallback={<EuiSkeletonText lines={3} />}>
          <LazyTimelineSlot conversation={conversation} loadInvestigation={load} />
        </Suspense>
      );
    },
  }));

  conversationTemplates.registerTemplateUIDefinition(templateId, ({ openSidebarConversation }) => ({
    name,
    icon,
    tabs: [overviewTabId, attachmentsTabId, timelineTabId],
    detailsFlyout: {
      header: function InvestigationFlyoutHeader({ conversation }) {
        return (
          // Agent Builder points the flyout's `aria-labelledby` at the header, so it must not
          // collapse to nothing while the slot's chunk loads.
          <Suspense fallback={<ConversationTitle title={conversation.title} />}>
            <LazyHeaderSlot conversation={conversation} loadInvestigation={load} />
          </Suspense>
        );
      },
      footer: function InvestigationFlyoutFooter({ conversation }) {
        return (
          <Suspense fallback={null}>
            <LazyFooterSlot
              conversation={conversation}
              loadInvestigation={load}
              onOpenChat={() => openSidebarConversation(conversation.id)}
            />
          </Suspense>
        );
      },
    },
  }));
};
