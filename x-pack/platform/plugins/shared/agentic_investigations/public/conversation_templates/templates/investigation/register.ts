/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { ConversationTemplateBriefCardRenderProps } from '@kbn/agent-builder-browser';
import {
  registerAgenticInvestigationTemplateUI,
  type CloseInvestigationModalRenderProps,
  type EscalationModalRenderProps,
  type OverviewSlotRenderProps,
  type LiveStateSlotRenderProps,
} from '@kbn/agentic-investigations-common';
import { INVESTIGATION_TEMPLATE_ID } from '../../../../common';
import { EscalationModalBoundary } from '../../shared/escalation_modal/escalation_modal_boundary';
import { ProposedActionsBoundary } from '../../shared/proposed_actions/proposed_actions_boundary';
import { getSharedInvestigationsQueryClient } from '../../../shared_query_client';
import type { TemplateDefinition } from '../../registry/types';

const INVESTIGATION_TEMPLATE_NAME = i18n.translate(
  'xpack.agenticInvestigations.conversationTemplate.investigation.name',
  { defaultMessage: 'Investigation' }
);

const OVERVIEW_LOADING_LABEL = i18n.translate(
  'xpack.agenticInvestigations.detailsFlyout.overview.loading',
  { defaultMessage: 'Loading investigation…' }
);

/**
 * The `investigation` template: status, close, escalation, proposed actions, and the overview,
 * running state, and brief card from the query API.
 */
export const investigationTemplate: TemplateDefinition = {
  templateId: INVESTIGATION_TEMPLATE_ID,
  register: ({
    templateId,
    core,
    startDeps,
    services,
    escalationsEnabled,
    makeLazyWithProviders,
    renderAssignees,
    renderStatus,
  }) => {
    const { agentBuilder, proposals } = startDeps;

    // Write actions are registered unconditionally and decide at render time, inside these lazy
    // chunks, whether the user may use them: the privileges probe cannot answer during `start`.
    const LazyEscalationModal = makeLazyWithProviders<EscalationModalRenderProps>(async () => {
      const [{ ConnectedEscalationModal }, { PrivilegeGate }] = await Promise.all([
        import('../../shared/escalation_modal/connected_escalation_modal'),
        import('../../shared/privileges/privilege_gate'),
      ]);
      const GatedEscalationModal: React.FC<EscalationModalRenderProps> = (props) =>
        React.createElement(
          PrivilegeGate,
          { privilege: 'manageEscalations' },
          React.createElement(ConnectedEscalationModal, props)
        );
      return GatedEscalationModal;
    });

    const LazyManageEscalationsGate = makeLazyWithProviders<React.PropsWithChildren>(async () => {
      const { PrivilegeGate } = await import('../../shared/privileges/privilege_gate');
      const ManageEscalationsGate: React.FC<React.PropsWithChildren> = ({ children }) =>
        React.createElement(PrivilegeGate, { privilege: 'manageEscalations' }, children);
      return ManageEscalationsGate;
    });

    // Shares `getSharedInvestigationsQueryClient()` with a solution's queue page rather than
    // creating its own — see https://github.com/elastic/kibana/pull/292946#discussion_r4092473937.
    // Both read and decide the same proposals; an isolated client here would let a decision made
    // in one leave the other showing it as still pending. The overview, the header's running state,
    // and the brief cards share it too: a flyout and its header poll one investigation query.
    const makeLazyWithSharedClient = <P extends object>(
      getComponent: () => Promise<React.ComponentType<P>>
    ): React.LazyExoticComponent<React.ComponentType<P>> =>
      React.lazy(async () => {
        const [{ KibanaContextProvider }, { QueryClientProvider }, Component, queryClient] =
          await Promise.all([
            import('@kbn/kibana-react-plugin/public'),
            import('@kbn/react-query'),
            getComponent(),
            getSharedInvestigationsQueryClient(),
          ]);

        const Wrapped: React.FC<P> = (props) =>
          React.createElement(
            KibanaContextProvider,
            { services },
            React.createElement(
              QueryClientProvider,
              { client: queryClient },
              React.createElement(Component, props)
            )
          );

        return { default: Wrapped };
      });

    const LazyProposedActionsSlot = makeLazyWithSharedClient(async () => {
      const { ProposedActionsSlot } = await import(
        '../../shared/proposed_actions/proposed_actions_slot'
      );
      return ProposedActionsSlot;
    });

    const LazyInvestigationOverview = makeLazyWithSharedClient<OverviewSlotRenderProps>(
      async () => {
        const { InvestigationOverview } = await import(
          '../../../investigations/components/investigation_overview'
        );
        return InvestigationOverview;
      }
    );

    const LazyInvestigationLiveState = makeLazyWithSharedClient<LiveStateSlotRenderProps>(
      async () => {
        const { InvestigationLiveState } = await import(
          '../../../investigations/components/investigation_live_state'
        );
        return InvestigationLiveState;
      }
    );

    const LazyInvestigationBriefCard =
      makeLazyWithSharedClient<ConversationTemplateBriefCardRenderProps>(async () => {
        const [{ InvestigationBriefCard }, { createInvestigationCardsLoader }] = await Promise.all([
          import('../../../investigations/components/investigation_brief_card'),
          import('../../../investigations/investigation_cards_loader'),
        ]);
        // Created once, with the chunk: every card shares it, so one tick of cards is one request.
        const loader = createInvestigationCardsLoader(core.http);
        const BriefCard: React.FC<ConversationTemplateBriefCardRenderProps> = (props) =>
          React.createElement(InvestigationBriefCard, { ...props, loader });
        return BriefCard;
      });

    const InvestigationBriefCardWithFallback: React.FC<ConversationTemplateBriefCardRenderProps> = (
      props
    ) =>
      React.createElement(
        React.Suspense,
        { fallback: null },
        React.createElement(LazyInvestigationBriefCard, props)
      );

    const LazyConnectedCloseInvestigationModal =
      makeLazyWithProviders<CloseInvestigationModalRenderProps>(async () => {
        const [{ ConnectedCloseInvestigationModal }, { PrivilegeGate }] = await Promise.all([
          import('../../shared/connected_status/connected_close_investigation_modal'),
          import('../../shared/privileges/privilege_gate'),
        ]);
        const GatedCloseInvestigationModal: React.FC<CloseInvestigationModalRenderProps> = (
          props
        ) =>
          React.createElement(
            PrivilegeGate,
            { privilege: 'manageInvestigations' },
            React.createElement(ConnectedCloseInvestigationModal, props)
          );
        return GatedCloseInvestigationModal;
      });

    const renderCloseInvestigationModal = (props: CloseInvestigationModalRenderProps) =>
      React.createElement(
        EscalationModalBoundary,
        null,
        React.createElement(LazyConnectedCloseInvestigationModal, props)
      );

    registerAgenticInvestigationTemplateUI({
      conversationTemplates: agentBuilder.conversationTemplates,
      templateId,
      name: INVESTIGATION_TEMPLATE_NAME,
      icon: 'magnifyExclamation',
      renderAssignees,
      // The toggle itself disables when the user may not change the status.
      renderStatus,
      renderCloseInvestigationModal,
      renderOverview: (props) =>
        React.createElement(
          EscalationModalBoundary,
          { loadingLabel: OVERVIEW_LOADING_LABEL },
          React.createElement(LazyInvestigationOverview, props)
        ),
      renderLiveState: (props) =>
        React.createElement(
          React.Suspense,
          { fallback: null },
          React.createElement(LazyInvestigationLiveState, props)
        ),
      briefCard: InvestigationBriefCardWithFallback,
      // Without escalations the footer has no "Open escalation" button.
      renderEscalationModal: escalationsEnabled
        ? (props) =>
            React.createElement(
              EscalationModalBoundary,
              null,
              React.createElement(LazyEscalationModal, props)
            )
        : undefined,
      wrapEscalationButton: escalationsEnabled
        ? (button) =>
            React.createElement(
              React.Suspense,
              { fallback: null },
              React.createElement(LazyManageEscalationsGate, null, button)
            )
        : undefined,
      // Listing and deciding proposals needs the proposals plugin, which is optional here.
      renderProposedActions: proposals
        ? (props) =>
            React.createElement(
              ProposedActionsBoundary,
              null,
              React.createElement(LazyProposedActionsSlot, props)
            )
        : undefined,
    });
  },
};
