/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateQuery } from '@kbn/esql-language';
import { z as z4 } from '@kbn/zod/v4';
import type { EsqlAttachmentData } from '@kbn/agent-builder-common/attachments';
import { AttachmentType, esqlAttachmentDataSchema } from '@kbn/agent-builder-common/attachments';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import type {
  AttachmentTypeDefinition,
  SurfaceComposition,
  SurfaceNode,
} from '@kbn/agent-builder-server/attachments';
import { i18n } from '@kbn/i18n';
import type { Logger } from '@kbn/logging';
import type { SerializableRecord } from '@kbn/utility-types';
import { SURFACE_LIMITS, clampText, hasText } from './surface_helpers';

/** The params of Discover's locator that an ES|QL attachment opens it with. */
export interface DiscoverEsqlLocatorParams extends SerializableRecord {
  query: { esql: string };
}

/** The part of Discover's locator the `esql` surface composition uses. */
export interface DiscoverEsqlLocator {
  getLocation: (params: DiscoverEsqlLocatorParams) => Promise<{ app: string; path: string }>;
}

export interface EsqlAttachmentTypeDeps {
  /** Discover's locator, registered on the server, or nothing when Discover is off. */
  getDiscoverLocator?: () => DiscoverEsqlLocator | undefined;
  logger?: Logger;
}

/**
 * Creates the definition for the `esql` attachment type.
 */
export const createEsqlAttachmentType = ({
  getDiscoverLocator,
  logger,
}: EsqlAttachmentTypeDeps = {}): AttachmentTypeDefinition<
  AttachmentType.esql,
  EsqlAttachmentData
> => {
  /** The query in Discover, as an app path, or nothing when it can't be resolved. */
  const toDiscoverLink = async (query: string): Promise<SurfaceNode[]> => {
    const locator = getDiscoverLocator?.();
    if (!locator) {
      return [];
    }

    try {
      const { app, path } = await locator.getLocation({ query: { esql: query } });

      return path.length <= SURFACE_LIMITS.linkPath
        ? [
            {
              type: 'link',
              label: i18n.translate(
                'xpack.agentBuilderPlatform.attachments.esql.surface.openInDiscover',
                {
                  defaultMessage: 'Open in Discover',
                }
              ),
              app,
              path,
            },
          ]
        : [];
    } catch (error) {
      logger?.debug(`Leaving out the Discover link of an ES|QL attachment: ${error.message}`);
      return [];
    }
  };

  return {
    id: AttachmentType.esql,
    validate: async (input) => {
      const parseResult = esqlAttachmentDataSchema.safeParse(input);
      if (!parseResult.success) {
        const { $schema, ...schema } = z4.toJSONSchema(esqlAttachmentDataSchema as z4.ZodType, {
          unrepresentable: 'any',
          io: 'input',
        }) as Record<string, unknown>;
        return {
          valid: false,
          error: `message: ${parseResult.error.message}, schema: ${JSON.stringify(schema)}`,
        };
      }

      const validationResult = await validateQuery(parseResult.data.query);
      if (validationResult.errors.length > 0) {
        const message = `Query validation returned errors: \n${validationResult.errors
          .map((error) => ('text' in error ? error.text : 'message' in error ? error.message : ''))
          .join('\n')}`;
        return { valid: false, error: message };
      }

      return { valid: true, data: parseResult.data };
    },
    format: (attachment) => {
      return {
        getRepresentation: () => {
          return { type: 'text', value: formatEsqlAttachment(attachment.data) };
        },
      };
    },
    toSurfaceComposition: async ({
      data: { query, description },
    }): Promise<SurfaceComposition> => ({
      type: 'view',
      body: [
        ...(hasText(description) ? [{ type: 'markdown' as const, text: description }] : []),
        ...(hasText(query)
          ? [
              {
                type: 'code' as const,
                language: 'esql',
                text: clampText(query, SURFACE_LIMITS.codeText),
              },
            ]
          : []),
        ...(hasText(query) ? await toDiscoverLink(query) : []),
      ],
    }),
    getAgentDescription: () => {
      return `Represents an ES|QL query, which can be executed using the ${platformCoreTools.executeEsql} tool

      When rendered inline, displays the query to the user in a code block.`;
    },
    getTools: () => [platformCoreTools.executeEsql],
  };
};

const formatEsqlAttachment = (data: EsqlAttachmentData): string => {
  let formatted = data.description ? `${data.description}\n` : '';
  formatted += `\`\`\`esql\n${data.query}\n\`\`\``;
  return formatted;
};
