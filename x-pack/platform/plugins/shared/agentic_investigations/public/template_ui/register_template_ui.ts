/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import {
  registerAgenticInvestigationTemplateUI,
  registerEscalationTemplateUI,
  type CloseInvestigationModalRenderProps,
  type RenderAssignees,
  type RenderLinkedInvestigations,
  type RenderStatus,
} from '@kbn/agentic-investigations-common';
import { ESCALATION_TEMPLATE_ID, INVESTIGATION_TEMPLATE_ID } from '../../common';
import { getAgenticInvestigationsCapabilities } from '../hooks/use_agentic_investigations_capabilities';
import { EscalationModalBoundary } from '../components/escalation_modal/escalation_modal_boundary';
import { ProposedActionsBoundary } from '../components/proposed_actions/proposed_actions_boundary';
import { getSharedInvestigationsQueryClient } from '../shared_query_client';
import type { AgenticInvestigationsPublicStartDependencies } from '../types';

const INVESTIGATION_TEMPLATE_NAME = i18n.translate(
  'xpack.agenticInvestigations.conversationTemplate.investigation.name',
  { defaultMessage: 'Investigation' }
);

const ESCALATION_TEMPLATE_NAME = i18n.translate(
  'xpack.agenticInvestigations.conversationTemplate.escalation.name',
  { defaultMessage: 'Escalation' }
);

const LINKED_INVESTIGATIONS_LOADING_LABEL = i18n.translate(
  'xpack.agenticInvestigations.linkedInvestigations.loading',
  { defaultMessage: 'Loading linked investigations…' }
);

export interface RegisterInvestigationTemplateUIOptions {
  core: CoreStart;
  startDeps: AgenticInvestigationsPublicStartDependencies & {
    agentBuilder: AgentBuilderPluginStart;
  };
}

/**
 * Registers the conversation details flyout UI for the `investigation` and `escalation`
 * conversation templates. Write actions are gated on the agentic investigations UI capabilities.
 */
export const registerInvestigationTemplateUI = ({
  core,
  startDeps,
}: RegisterInvestigationTemplateUIOptions): void => {
  const { agentBuilder, proposals } = startDeps;
  // What the connected render props read through `useKibana`.
  const services = { ...core, ...startDeps };

  // Every connected render prop mounts inside the Agent Builder flyout's own React root, so it
  // needs KibanaContextProvider + QueryClientProvider. Each factory call creates an independent
  // QueryClient so caches don't bleed across flyouts. Wrapped lazily so these heavy deps land in
  // async chunks rather than the page load bundle.
  const makeLazyWithProviders = <P extends object>(
    getComponent: () => Promise<React.ComponentType<P>>
  ): React.LazyExoticComponent<React.ComponentType<P>> =>
    React.lazy(async () => {
      const [{ KibanaContextProvider }, { QueryClient, QueryClientProvider }, Component] =
        await Promise.all([
          import('@kbn/kibana-react-plugin/public'),
          import('@kbn/react-query'),
          getComponent(),
        ]);

      const queryClient = new QueryClient();

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

  const LazyEscalationModal = makeLazyWithProviders(async () => {
    const { ConnectedEscalationModal } = await import(
      '../components/escalation_modal/connected_escalation_modal'
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
      import('../components/proposed_actions/proposed_actions_slot'),
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

  const LazyConnectedAssignees = makeLazyWithProviders(async () => {
    const { ConnectedAssignees } = await import(
      '../components/connected_assignees/connected_assignees'
    );
    return ConnectedAssignees as React.ComponentType<
      React.ComponentProps<typeof ConnectedAssignees>
    >;
  });

  const LazyConnectedStatusToggle = makeLazyWithProviders(async () => {
    const { ConnectedStatusToggle } = await import(
      '../components/connected_status/connected_status_toggle'
    );
    return ConnectedStatusToggle as React.ComponentType<
      React.ComponentProps<typeof ConnectedStatusToggle>
    >;
  });

  const LazyConnectedCloseInvestigationModal = makeLazyWithProviders(async () => {
    const { ConnectedCloseInvestigationModal } = await import(
      '../components/connected_status/connected_close_investigation_modal'
    );
    return ConnectedCloseInvestigationModal as React.ComponentType<
      React.ComponentProps<typeof ConnectedCloseInvestigationModal>
    >;
  });

  const LazyConnectedLinkedInvestigations = makeLazyWithProviders(async () => {
    const { ConnectedLinkedInvestigations } = await import(
      '../components/connected_linked_investigations/connected_linked_investigations'
    );
    return ConnectedLinkedInvestigations as React.ComponentType<
      React.ComponentProps<typeof ConnectedLinkedInvestigations>
    >;
  });

  const {
    manageEscalations: canManageEscalations,
    manageInvestigations: canManageInvestigations,
    showEscalations: canShowEscalations,
  } = getAgenticInvestigationsCapabilities(core.application.capabilities);

  const renderAssignees: RenderAssignees = (props) =>
    React.createElement(
      EscalationModalBoundary,
      null,
      React.createElement(LazyConnectedAssignees, props)
    );

  const renderStatus: RenderStatus = (props) =>
    React.createElement(
      EscalationModalBoundary,
      null,
      React.createElement(LazyConnectedStatusToggle, props)
    );

  const renderCloseInvestigationModal = canManageInvestigations
    ? (props: CloseInvestigationModalRenderProps) =>
        React.createElement(
          EscalationModalBoundary,
          null,
          React.createElement(LazyConnectedCloseInvestigationModal, props)
        )
    : undefined;

  const renderLinkedInvestigations: RenderLinkedInvestigations = (props) =>
    React.createElement(
      EscalationModalBoundary,
      { loadingLabel: LINKED_INVESTIGATIONS_LOADING_LABEL },
      React.createElement(LazyConnectedLinkedInvestigations, props)
    );

  registerAgenticInvestigationTemplateUI({
    conversationTemplates: agentBuilder.conversationTemplates,
    templateId: INVESTIGATION_TEMPLATE_ID,
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

  registerEscalationTemplateUI({
    conversationTemplates: agentBuilder.conversationTemplates,
    templateId: ESCALATION_TEMPLATE_ID,
    name: ESCALATION_TEMPLATE_NAME,
    icon: 'warning',
    renderAssignees,
    renderStatus: canManageEscalations && canManageInvestigations ? renderStatus : undefined,
    renderLinkedInvestigations: canShowEscalations ? renderLinkedInvestigations : undefined,
  });
};
