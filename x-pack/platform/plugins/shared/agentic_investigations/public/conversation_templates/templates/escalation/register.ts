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
  type RenderLinkedInvestigations,
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
  register: ({
    templateId,
    startDeps,
    capabilities,
    makeLazyWithProviders,
    renderAssignees,
    renderStatus,
  }) => {
    const { agentBuilder } = startDeps;
    const {
      manageEscalations: canManageEscalations,
      manageInvestigations: canManageInvestigations,
      showEscalations: canShowEscalations,
    } = capabilities;

    const LazyConnectedLinkedInvestigations = makeLazyWithProviders(async () => {
      const { ConnectedLinkedInvestigations } = await import('./flyout/linked_investigations');
      return ConnectedLinkedInvestigations as React.ComponentType<
        React.ComponentProps<typeof ConnectedLinkedInvestigations>
      >;
    });

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
      renderStatus: canManageEscalations && canManageInvestigations ? renderStatus : undefined,
      renderLinkedInvestigations: canShowEscalations ? renderLinkedInvestigations : undefined,
    });
  },
};
