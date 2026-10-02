/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  registerAgenticInvestigationTemplateUI,
  type CloseInvestigationModalRenderProps,
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

/** The `investigation` template: status, close, escalation, and proposed actions. */
export const investigationTemplate: TemplateDefinition = {
  templateId: INVESTIGATION_TEMPLATE_ID,
  register: ({
    templateId,
    startDeps,
    services,
    capabilities,
    makeLazyWithProviders,
    renderAssignees,
    renderStatus,
  }) => {
    const { agentBuilder, proposals } = startDeps;
    const {
      manageEscalations: canManageEscalations,
      manageInvestigations: canManageInvestigations,
    } = capabilities;

    const LazyEscalationModal = makeLazyWithProviders(async () => {
      const { ConnectedEscalationModal } = await import(
        '../../shared/escalation_modal/connected_escalation_modal'
      );
      return ConnectedEscalationModal as React.ComponentType<
        React.ComponentProps<typeof ConnectedEscalationModal>
      >;
    });

    // Shares `getSharedInvestigationsQueryClient()` with a solution's queue page rather than
    // creating its own — see https://github.com/elastic/kibana/pull/292946#discussion_r4092473937.
    // Both read and decide the same proposals; an isolated client here would let a decision made
    // in one leave the other showing it as still pending.
    const LazyProposedActionsSlot = React.lazy(async () => {
      const [
        { KibanaContextProvider },
        { QueryClientProvider },
        { ProposedActionsSlot },
        queryClient,
      ] = await Promise.all([
        import('@kbn/kibana-react-plugin/public'),
        import('@kbn/react-query'),
        import('../../shared/proposed_actions/proposed_actions_slot'),
        getSharedInvestigationsQueryClient(),
      ]);

      const WrappedSlot: React.FC<React.ComponentProps<typeof ProposedActionsSlot>> = (props) =>
        React.createElement(
          KibanaContextProvider,
          { services },
          React.createElement(
            QueryClientProvider,
            { client: queryClient },
            React.createElement(ProposedActionsSlot, props)
          )
        );

      return { default: WrappedSlot };
    });

    const LazyConnectedCloseInvestigationModal = makeLazyWithProviders(async () => {
      const { ConnectedCloseInvestigationModal } = await import(
        '../../shared/connected_status/connected_close_investigation_modal'
      );
      return ConnectedCloseInvestigationModal as React.ComponentType<
        React.ComponentProps<typeof ConnectedCloseInvestigationModal>
      >;
    });

    const renderCloseInvestigationModal = canManageInvestigations
      ? (props: CloseInvestigationModalRenderProps) =>
          React.createElement(
            EscalationModalBoundary,
            null,
            React.createElement(LazyConnectedCloseInvestigationModal, props)
          )
      : undefined;

    registerAgenticInvestigationTemplateUI({
      conversationTemplates: agentBuilder.conversationTemplates,
      templateId,
      name: INVESTIGATION_TEMPLATE_NAME,
      icon: 'magnifyExclamation',
      renderAssignees,
      renderStatus: canManageInvestigations ? renderStatus : undefined,
      renderCloseInvestigationModal,
      renderEscalationModal: canManageEscalations
        ? (props) =>
            React.createElement(
              EscalationModalBoundary,
              null,
              React.createElement(LazyEscalationModal, props)
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
