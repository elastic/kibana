/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createErrorResult } from '@kbn/agent-builder-server';
import { platformCoreCasesTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools';
import type { KibanaRequest } from '@kbn/core-http-server';
import { Owner } from '../../../common/bundled-types.gen';
import type { CasesClient } from '../../client';
import {
  CASES_TOOL_TEXT_INSTRUCTION,
  CASES_SOLUTION_CONTEXT_INSTRUCTION,
} from '../utils/tool_instructions';

type GetCasesClientFn = (request: KibanaRequest) => Promise<CasesClient>;

const MAX_PER_PAGE = 50;
const DEFAULT_PER_PAGE = 20;

const findTemplatesSchema = z.object({
  owner: Owner.describe('The solution the templates belong to. Required.'),
  search: z
    .string()
    .max(1000)
    .optional()
    .describe(
      'Free-text search matched against the template name (substring, case-insensitive), description, and field names/labels. Omit to list all templates for `owner`.'
    ),
  tags: z
    .array(z.string().max(256))
    .max(100)
    .optional()
    .describe('Filter to templates having ANY of these tags.'),
  isEnabled: z
    .boolean()
    .optional()
    .describe('Filter to enabled (true) or disabled (false) templates. Omit for both.'),
  page: z.number().int().min(1).optional().describe('Page number (1-indexed). Default 1.'),
  perPage: z
    .number()
    .int()
    .min(1)
    .max(MAX_PER_PAGE)
    .optional()
    .describe(`Results per page, max ${MAX_PER_PAGE}. Default ${DEFAULT_PER_PAGE}.`),
});

export const findTemplatesTool = (
  getCasesClientFn: GetCasesClientFn
): BuiltinToolDefinition<typeof findTemplatesSchema> => {
  return {
    id: platformCoreCasesTools.findTemplates,
    type: ToolType.builtin,
    description: `Look up case templates by name, or list them, to resolve the \`case_template_id\` required by \`${platformCoreCasesTools.manage}\`'s \`create_from_template\` mode.

${CASES_SOLUTION_CONTEXT_INSTRUCTION}

Use \`search\` with the name the user mentioned — it matches as a case-insensitive substring against the template name (also checks description and field names/labels). Omit \`search\` to list all templates for \`owner\`.

If zero templates match, say so — do not guess an ID. If more than one matches, list the candidates (name + description) and ask the user to confirm which one before calling \`create_from_template\`.${CASES_TOOL_TEXT_INSTRUCTION}`,
    annotations: {
      title: 'Find Case Templates',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    schema: findTemplatesSchema,
    tags: ['cases'],
    handler: async ({ owner, search, tags, isEnabled, page, perPage }, { request, logger }) => {
      try {
        const casesClient = await getCasesClientFn(request);
        const requestedPage = page ?? 1;
        const requestedPerPage = Math.min(perPage ?? DEFAULT_PER_PAGE, MAX_PER_PAGE);

        const { templates, total } = await casesClient.templates.getAllTemplates({
          page: requestedPage,
          perPage: requestedPerPage,
          sortField: 'name',
          sortOrder: 'asc',
          search: search ?? '',
          tags: tags ?? [],
          author: [],
          owner: [owner],
          isDeleted: false,
          isEnabled,
        });

        const results = templates.map((template) => ({
          templateId: template.templateId,
          name: template.name,
          description: template.description ?? null,
          owner: template.owner,
          tags: template.tags ?? [],
          isEnabled: template.isEnabled ?? true,
          isDefault: template.isDefault ?? false,
          fieldCount: template.fieldCount ?? 0,
          usageCount: template.usageCount ?? 0,
          lastUsedAt: template.lastUsedAt ?? null,
        }));

        const totalPages = Math.max(1, Math.ceil(total / requestedPerPage));
        let message: string | undefined;
        if (total === 0) {
          message = search
            ? `No templates found matching "${search}" for owner "${owner}".`
            : `No templates found for owner "${owner}".`;
        } else if (requestedPage < totalPages) {
          message = `Showing page ${requestedPage} of ${totalPages} (${results.length} of ${total} matches). Pass \`page\` to fetch additional pages.`;
        }

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                total,
                templates: results,
                ...(message && { message }),
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`[Find Templates Tool] Error finding templates: ${errorMessage}`);
        return {
          results: [createErrorResult(`Error finding templates: ${errorMessage}`)],
        };
      }
    },
  };
};
