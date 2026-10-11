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
  type EscalationModalRenderProps,
} from '@kbn/agentic-investigations-common';
import { INVESTIGATION_TEMPLATE_ID } from '../../../../common';
import { EscalationModalBoundary } from '../../shared/escalation_modal/escalation_modal_boundary';
import {
  ProposedActionsBoundary,
  ProposedActionsCountBoundary,
} from '../../shared/proposed_actions/proposed_actions_boundary';
import { getSharedInvestigationsQueryClient } from '../../../shared_query_client';
import { copyLink } from '../../shared/copy_link';
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
    core,
    startDeps,
    services,
    escalationsEnabled,
    makeLazyWithProviders,
    groupedAttachments,
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
    // in one leave the other showing it as still pending.
    const lazyWithSharedQueryClient = <P extends object>(
      load: () => Promise<React.ComponentType<P>>
    ) =>
      React.lazy(async () => {
        const [{ KibanaContextProvider }, { QueryClientProvider }, Component, queryClient] =
          await Promise.all([
            import('@kbn/kibana-react-plugin/public'),
            import('@kbn/react-query'),
            load(),
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

    const LazyProposedActionsSlot = lazyWithSharedQueryClient(
      async () =>
        (await import('../../shared/proposed_actions/proposed_actions_slot')).ProposedActionsSlot
    );

    const LazyProposedActionsCount = lazyWithSharedQueryClient(
      async () =>
        (await import('../../shared/proposed_actions/proposed_actions_count')).ProposedActionsCount
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
      groupedAttachments,
      name: INVESTIGATION_TEMPLATE_NAME,
      icon: 'magnifyExclamation',
      renderAssignees,
      // The toggle itself disables when the user may not change the status.
      renderStatus,
      renderCloseInvestigationModal,
      // The flyout's Copy link button confirms success itself; only a failure needs a toast.
      onCopyLink: (url) => copyLink(core.notifications.toasts, url),
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
      renderProposedActionsCount: proposals
        ? (props) =>
            React.createElement(
              ProposedActionsCountBoundary,
              null,
              React.createElement(LazyProposedActionsCount, props)
            )
        : undefined,
    });
  },
};
