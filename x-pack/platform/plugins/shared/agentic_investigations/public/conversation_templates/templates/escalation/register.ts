/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  registerEscalationTemplateUI,
  type LinkedInvestigationsSlotRenderProps,
  type RenderLinkedInvestigations,
  type RenderSyncIndicator,
  type SyncIndicatorSlotRenderProps,
} from '@kbn/agentic-investigations-common';
import { ESCALATION_TEMPLATE_ID } from '../../../../common';
import { EscalationModalBoundary } from '../../shared/escalation_modal/escalation_modal_boundary';
import type { TemplateDefinition } from '../../registry/types';

const ESCALATION_TEMPLATE_NAME = i18n.translate(
  'xpack.agenticInvestigations.conversationTemplate.escalation.name',
  { defaultMessage: 'Escalation' }
);

const LINKED_INVESTIGATIONS_LOADING_LABEL = i18n.translate(
  'xpack.agenticInvestigations.linkedInvestigations.loading',
  { defaultMessage: 'Loading linked investigations…' }
);

/** The `escalation` template: status and the linked investigations. */
export const escalationTemplate: TemplateDefinition = {
  templateId: ESCALATION_TEMPLATE_ID,
  register: ({ templateId, startDeps, makeLazyWithProviders, renderAssignees, renderStatus }) => {
    const { agentBuilder } = startDeps;

    // Registered unconditionally: whether the user may see escalations is decided at render time,
    // inside the lazy chunk, because the privileges probe cannot answer during `start`.
    const LazyConnectedLinkedInvestigations =
      makeLazyWithProviders<LinkedInvestigationsSlotRenderProps>(async () => {
        const [{ ConnectedLinkedInvestigations }, { PrivilegeGate }] = await Promise.all([
          import('./flyout/linked_investigations'),
          import('../../shared/privileges/privilege_gate'),
        ]);
        const GatedLinkedInvestigations: React.FC<LinkedInvestigationsSlotRenderProps> = (props) =>
          React.createElement(
            PrivilegeGate,
            { privilege: 'readEscalations' },
            React.createElement(ConnectedLinkedInvestigations, props)
          );
        return GatedLinkedInvestigations;
      });

    // Syncing writes to the escalation, so it needs manage rather than read access.
    const LazyEscalationSyncIndicator = makeLazyWithProviders<SyncIndicatorSlotRenderProps>(
      async () => {
        const [{ EscalationSyncIndicator }, { PrivilegeGate }] = await Promise.all([
          import('./flyout/escalation_sync_indicator'),
          import('../../shared/privileges/privilege_gate'),
        ]);
        const GatedSyncIndicator: React.FC<SyncIndicatorSlotRenderProps> = (props) =>
          React.createElement(
            PrivilegeGate,
            { privilege: 'manageEscalations' },
            React.createElement(EscalationSyncIndicator, props)
          );
        return GatedSyncIndicator;
      }
    );

    const renderSyncIndicator: RenderSyncIndicator = (props) =>
      React.createElement(LazyEscalationSyncIndicator, props);

    const renderLinkedInvestigations: RenderLinkedInvestigations = (props) =>
      React.createElement(
        EscalationModalBoundary,
        { loadingLabel: LINKED_INVESTIGATIONS_LOADING_LABEL },
        React.createElement(LazyConnectedLinkedInvestigations, props)
      );

    registerEscalationTemplateUI({
      conversationTemplates: agentBuilder.conversationTemplates,
      templateId,
      name: ESCALATION_TEMPLATE_NAME,
      icon: 'warning',
      renderAssignees,
      // The toggle itself disables when the user may not change the status.
      renderStatus,
      renderLinkedInvestigations,
      renderSyncIndicator,
    });
  },
};
