/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { registerInvestigationAttachmentRenderer } from '../../investigation_attachments';
import { componentDiagramAttachmentRenderer } from './component_diagram_attachment_definition';

/** Registers the investigation_component_diagram flyout/inline renderer with Agent Builder. */
export const registerComponentDiagramAttachmentTypes = (
  agentBuilder: AgentBuilderPluginStart
): void => {
  registerInvestigationAttachmentRenderer(agentBuilder, componentDiagramAttachmentRenderer);
};
