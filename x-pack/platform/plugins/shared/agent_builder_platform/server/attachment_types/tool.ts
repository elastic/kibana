/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import type { EsqlToolConfig, EsqlToolParam } from '@kbn/agent-builder-common';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { TOOL_ATTACHMENT_TYPE, type ToolAttachmentData } from '../../common/attachments';

/**
 * Server-side definition for the `tool` attachment type.
 */
export const createToolAttachmentType = (): AttachmentTypeDefinition<
  typeof TOOL_ATTACHMENT_TYPE,
  ToolAttachmentData
> => ({
  id: TOOL_ATTACHMENT_TYPE,
  validate: (input) => {
    if (typeof input !== 'object' || input === null) {
      return { valid: false, error: '<root>: expected object' };
    }
    const candidate = input as Partial<ToolAttachmentData>;
    if (typeof candidate.id !== 'string' || candidate.id.length === 0) {
      return { valid: false, error: 'id: expected non-empty string' };
    }
    if (candidate.type !== ToolType.esql) {
      return {
        valid: false,
        error: `type: expected "${ToolType.esql}" (chat authoring MVP supports ES|QL only)`,
      };
    }
    if (typeof candidate.description !== 'string') {
      return { valid: false, error: 'description: expected string' };
    }
    if (candidate.tags !== undefined && !Array.isArray(candidate.tags)) {
      return { valid: false, error: 'tags: expected array of strings when present' };
    }
    if (typeof candidate.configuration !== 'object' || candidate.configuration === null) {
      return { valid: false, error: 'configuration: expected object' };
    }
    const config = candidate.configuration as Partial<EsqlToolConfig>;
    if (typeof config.query !== 'string') {
      return { valid: false, error: 'configuration.query: expected string' };
    }
    if (typeof config.params !== 'object' || config.params === null) {
      return { valid: false, error: 'configuration.params: expected object' };
    }
    return { valid: true, data: candidate as ToolAttachmentData };
  },
  format: (attachment) => {
    return {
      getRepresentation: () => {
        const { data } = attachment;
        const paramSummary = Object.entries(data.configuration.params)
          .map(([name, p]: [string, EsqlToolParam]) => {
            const optional = p.optional ? ' (optional)' : '';
            const def =
              p.defaultValue !== undefined ? `, default=${JSON.stringify(p.defaultValue)}` : '';
            return `- ${name}: ${p.type}${optional}${def} — ${p.description}`;
          })
          .join('\n');
        const value = [
          `Tool (id: ${data.id})`,
          `Type: ${data.type}`,
          `Description: ${data.description}`,
          `Tags: ${(data.tags ?? []).join(', ') || '(none)'}`,
          '',
          'ES|QL query:',
          data.configuration.query,
          '',
          'Parameters:',
          paramSummary || '(none)',
        ].join('\n');
        return { type: 'text', value };
      },
    };
  },
  getAgentDescription: () => {
    return `A \`tool\` attachment is a versioned, by-value snapshot of a candidate Agent Builder tool (ES|QL type only in this release). The user reviews it as an inline card with "Create tool" and (in canvas) "Test" buttons. Render it inline by emitting <render_attachment id="ATTACHMENT_ID" />. After patching, re-render the same attachment id so the card refreshes in place. Do not invent attachment ids — only render ids returned by propose_tool or patch_tool.`;
  },
});
