/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SmlTypeDefinition } from '@kbn/agent-builder-plugin/server';
import type { LensAttributes } from '@kbn/lens-embeddable-utils/config_builder';
import {
  LensConfigBuilder,
  type LensApiSchemaType,
} from '@kbn/lens-embeddable-utils/config_builder';

const VISUALIZATION_SML_TYPE = 'visualization';

const extractEsql = (attributes: LensAttributes): string => {
  try {
    const layers = (attributes.state?.datasourceStates as Record<string, unknown>)?.textBased as
      | { layers?: Record<string, { query?: { esql?: string } }> }
      | undefined;
    if (layers?.layers) {
      const firstLayer = Object.values(layers.layers)[0];
      if (firstLayer?.query?.esql) {
        return firstLayer.query.esql;
      }
    }
    return '';
  } catch {
    return '';
  }
};

const getChartType = (attributes: LensAttributes): string => {
  return attributes.visualizationType ?? '';
};

const toLensAttributes = (
  attributes: LensAttributes,
  references: LensAttributes['references'] | undefined
): LensAttributes => ({
  ...attributes,
  references: references ?? attributes.references ?? [],
});

const toLensApiConfig = (attributes: LensAttributes): LensApiSchemaType =>
  new LensConfigBuilder().toAPIFormat(attributes);

export const visualizationSmlType: SmlTypeDefinition = {
  id: VISUALIZATION_SML_TYPE,

  list: async (context) => {
    const finder = context.savedObjectsClient.createPointInTimeFinder({
      type: 'lens',
      perPage: 1000,
      namespaces: ['*'],
      fields: ['title'],
    });

    const items: Array<{ id: string; updatedAt: string; spaces: string[] }> = [];
    for await (const response of finder.find()) {
      for (const so of response.saved_objects) {
        items.push({
          id: so.id,
          updatedAt: so.updated_at ?? new Date().toISOString(),
          spaces: so.namespaces ?? [],
        });
      }
    }
    await finder.close();

    return items;
  },

  getSmlData: async (attachmentId, context) => {
    try {
      const so = await context.savedObjectsClient.get('lens', attachmentId);
      const attrs = so.attributes as LensAttributes;
      const title = attrs.title ?? attachmentId;
      const esql = extractEsql(attrs);
      const chartType = getChartType(attrs);
      const description = (attrs as { description?: string }).description ?? '';

      const contentParts = [title, description, chartType, esql].filter(Boolean);

      return {
        chunks: [
          {
            type: VISUALIZATION_SML_TYPE,
            title,
            content: contentParts.join('\n'),
            permissions: ['saved_object:lens/get'],
          },
        ],
      };
    } catch (error) {
      context.logger.warn(
        `SML visualization: failed to get data for '${attachmentId}': ${(error as Error).message}`
      );
      return undefined;
    }
  },

  toAttachment: async (item, context) => {
    try {
      const resolveResult = await context.savedObjectsClient.resolve(
        'lens',
        item.attachment_reference_id
      );
      const savedObject = resolveResult.saved_object as { error?: { message?: string } };
      if (savedObject?.error) {
        return undefined;
      }

      const lensAttributes = toLensAttributes(
        resolveResult.saved_object.attributes as LensAttributes,
        resolveResult.saved_object.references
      );
      const lensApiConfig = toLensApiConfig(lensAttributes);

      return {
        type: VISUALIZATION_SML_TYPE,
        data: {
          query: lensAttributes.title ?? item.attachment_reference_id,
          visualization: lensApiConfig as unknown as Record<string, unknown>,
          chart_type: lensApiConfig.type,
          esql: extractEsql(lensAttributes),
        },
      };
    } catch {
      return undefined;
    }
  },
};
