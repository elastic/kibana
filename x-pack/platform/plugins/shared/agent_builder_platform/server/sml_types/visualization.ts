/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SmlTypeDefinition } from '@kbn/semantic-layer-plugin/server';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';

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

export const visualizationSmlType: SmlTypeDefinition = {
  id: VISUALIZATION_SML_TYPE,
  originType: 'lens',
  fetchFrequency: () => '1h',

  async *list(context) {
    const finder = context.savedObjectsClient.createPointInTimeFinder({
      type: 'lens',
      perPage: 1000,
      namespaces: ['*'],
      fields: ['title'],
    });

    try {
      for await (const response of finder.find()) {
        yield response.saved_objects.map((so) => ({
          id: so.id,
          updatedAt: so.updated_at ?? new Date().toISOString(),
          spaces: so.namespaces ?? [],
        }));
      }
    } finally {
      await finder.close();
    }
  },

  getSmlData: async (originId, context) => {
    try {
      const so = await context.savedObjectsClient.get('lens', originId);
      const attrs = so.attributes as LensAttributes;
      const title = attrs.title ?? originId;
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
        `SML visualization: failed to get data for '${originId}': ${(error as Error).message}`
      );
      return undefined;
    }
  },
};
