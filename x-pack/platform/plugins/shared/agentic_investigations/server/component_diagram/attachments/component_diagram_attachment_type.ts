/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COMPONENT_DIAGRAM_ATTACHMENT_TYPE } from '../../../common/component_diagram/constants';
import {
  investigationComponentDiagramSchema,
  type InvestigationComponentDiagram,
} from '../../../common/component_diagram/component_diagram';
import { defineInvestigationAttachment } from '../../investigation_attachments';
import {
  componentDiagramStorageSettings,
  type ComponentDiagramDocument,
  type ComponentDiagramStorageSettings,
} from '../storage/component_diagram_storage';

/** Text the LLM sees: the Mermaid source, the problem nodes, and the description. */
export const formatComponentDiagramForAgent = ({
  conversationId,
  title,
  mermaid,
  problemNodeIds = [],
  description,
}: InvestigationComponentDiagram): string =>
  [
    '## Investigation component diagram',
    `Conversation: ${conversationId}`,
    title ? `Title: ${title}` : undefined,
    problemNodeIds.length > 0 ? `Problem nodes: ${problemNodeIds.join(', ')}` : undefined,
    description ? `Problem: ${description}` : undefined,
    '```mermaid',
    mermaid,
    '```',
  ]
    .filter((line): line is string => line !== undefined)
    .join('\n');

/**
 * `investigation_component_diagram`: a Mermaid flowchart of the components an investigation was
 * about and where the problem is, one document per space and conversation in
 * `.kibana-investigation-component-diagram`, replaced as a whole on every write. Origin and
 * attachment id are the document id.
 */
export const componentDiagramAttachment = defineInvestigationAttachment<
  typeof COMPONENT_DIAGRAM_ATTACHMENT_TYPE,
  ComponentDiagramStorageSettings,
  ComponentDiagramDocument
>({
  type: COMPONENT_DIAGRAM_ATTACHMENT_TYPE,
  storageSettings: componentDiagramStorageSettings,
  schema: investigationComponentDiagramSchema,
  // The investigation overview shows the diagram; the chat does not.
  hiddenInConversation: true,
  format: formatComponentDiagramForAgent,
  describe: () => 'Component diagram',
  agentDescription:
    'The investigation component diagram is a Mermaid flowchart of the services, processes, or other components the investigation was about, how they interact, and which of them the problem is in.\n\n' +
    'Rules:\n' +
    '- Update it with the `investigations.set_component_diagram` tool, sending the whole diagram every time.\n' +
    "- The investigation's overview shows the diagram, not the chat; do not render it inline.",
});
