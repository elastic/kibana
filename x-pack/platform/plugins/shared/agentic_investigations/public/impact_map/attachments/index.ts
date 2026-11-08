/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { ImpactMapRenderer } from '../../types';
import { registerInvestigationAttachmentRenderer } from '../../investigation_attachments';
import { createImpactMapAttachmentRenderer } from './impact_map_attachment_definition';

/** Registers the impact map cards with Agent Builder. */
export const registerImpactMapAttachmentTypes = (
  agentBuilder: AgentBuilderPluginStart,
  getImpactMapRenderer: () => ImpactMapRenderer | undefined
): void => {
  registerInvestigationAttachmentRenderer(
    agentBuilder,
    createImpactMapAttachmentRenderer(getImpactMapRenderer)
  );
};
