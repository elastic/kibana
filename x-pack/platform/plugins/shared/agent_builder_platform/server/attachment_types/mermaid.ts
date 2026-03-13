/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MermaidAttachmentData } from '@kbn/agent-builder-common/attachments';
import { AttachmentType, mermaidAttachmentDataSchema } from '@kbn/agent-builder-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';

const VALID_DIAGRAM_DECLARATIONS = [
  'graph ',
  'graph\n',
  'flowchart ',
  'flowchart\n',
  'sequenceDiagram',
  'classDiagram',
  'stateDiagram',
  'stateDiagram-v2',
  'erDiagram',
  'gantt',
  'pie',
  'journey',
  'gitGraph',
  'mindmap',
  'timeline',
  'quadrantChart',
  'sankey',
  'xychart',
  'block',
  'packet',
  'kanban',
  'architecture',
];

const validateMermaidSyntax = (content: string): { valid: boolean; error?: string } => {
  const trimmed = content.trim();
  if (!trimmed) {
    return { valid: false, error: 'Mermaid definition must not be empty' };
  }

  const startsWithValidDeclaration = VALID_DIAGRAM_DECLARATIONS.some((declaration) =>
    trimmed.startsWith(declaration)
  );

  if (!startsWithValidDeclaration) {
    return {
      valid: false,
      error: `Mermaid definition must start with a valid diagram declaration (e.g., graph TD, flowchart LR, sequenceDiagram, classDiagram, erDiagram, gantt, pie, stateDiagram-v2, etc.)`,
    };
  }

  return { valid: true };
};

export const createMermaidAttachmentType = (): AttachmentTypeDefinition<
  AttachmentType.mermaid,
  MermaidAttachmentData
> => {
  return {
    id: AttachmentType.mermaid,
    validate: (input) => {
      const parseResult = mermaidAttachmentDataSchema.safeParse(input);
      if (!parseResult.success) {
        return { valid: false, error: parseResult.error.message };
      }

      const syntaxResult = validateMermaidSyntax(parseResult.data.content);
      if (!syntaxResult.valid) {
        return { valid: false, error: syntaxResult.error! };
      }

      return { valid: true, data: parseResult.data };
    },
    format: (attachment) => {
      return {
        getRepresentation: () => {
          const title = attachment.data.title ? `${attachment.data.title}\n` : '';
          return {
            type: 'text',
            value: `${title}\`\`\`mermaid\n${attachment.data.content}\n\`\`\``,
          };
        },
      };
    },
    getAgentDescription: () => {
      return 'A mermaid attachment contains a Mermaid diagram definition. It can be rendered inline as an SVG diagram using <render_attachment id="..." />.';
    },
    getTools: () => [],
    isReadonly: false,
  };
};
