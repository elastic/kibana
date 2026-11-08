/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { ImpactMapRenderer } from '../../types';
import { registerInvestigationAttachmentRenderer } from '../../investigation_attachments';
import {
  createImpactMapAttachmentRenderer,
  createTimelineAttachmentRenderer,
} from './impact_map_attachment_definition';

/** Registers the impact map cards with Agent Builder. */
export const registerImpactMapAttachmentTypes = (
  agentBuilder: AgentBuilderPluginStart,
  getImpactMapRenderer: () => ImpactMapRenderer | undefined
): void => {
  registerInvestigationAttachmentRenderer(
    agentBuilder,
    createImpactMapAttachmentRenderer(getImpactMapRenderer, (conversationId, tab) => {
      // Opens the investigation flyout on the tab, so the card leads to the full view.
      agentBuilder.openConversationDetails({ conversationId, initialTabId: tab });
    })
  );
  registerInvestigationAttachmentRenderer(
    agentBuilder,
    createTimelineAttachmentRenderer((conversationId, tab) => {
      agentBuilder.openConversationDetails({ conversationId, initialTabId: tab });
    })
  );
};
