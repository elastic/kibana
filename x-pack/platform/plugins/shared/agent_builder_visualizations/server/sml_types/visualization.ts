/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SmlTypeDefinition } from '@kbn/agent-builder-sml-plugin/server';
import { kibanaSavedObjectPermissions } from '@kbn/agent-builder-sml-plugin/server';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import {
  withLensReferences,
  toLensApiConfig,
  toSupportedChartType,
  extractEsqlFromLens,
} from '../lens_reference';

const VISUALIZATION_SML_TYPE = 'visualization';
const VISUALIZATION_SAVED_OBJECT_TYPE = 'lens';

const getChartType = (attributes: LensAttributes): string => {
  return attributes.visualizationType ?? '';
};

export const visualizationSmlType: SmlTypeDefinition = {
  id: VISUALIZATION_SML_TYPE,
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

  getSmlEntry: async (originId, context) => {
    try {
      const so = await context.savedObjectsClient.get('lens', originId);
      const attrs = so.attributes as LensAttributes;
      const title = attrs.title ?? originId;
      const esql = extractEsqlFromLens(attrs);
      const chartType = getChartType(attrs);
      const description = (attrs as { description?: string }).description ?? '';

      const contentParts = [title, description, chartType, esql].filter(Boolean);

      return {
        type: VISUALIZATION_SML_TYPE,
        title,
        content: contentParts.join('\n'),
      };
    } catch (error) {
      context.logger.warn(
        `SML visualization: failed to get data for '${originId}': ${(error as Error).message}`
      );
      return undefined;
    }
  },

  getPermissions: () =>
    kibanaSavedObjectPermissions({ savedObjectType: VISUALIZATION_SAVED_OBJECT_TYPE }),

  toAttachment: async (item, context) => {
    const resolveResult = await context.savedObjectsClient.resolve('lens', item.origin_id ?? '');
    const savedObject = resolveResult.saved_object as { error?: { message?: string } };
    if (savedObject?.error) {
      return undefined;
    }

    const lensAttributes = withLensReferences(
      resolveResult.saved_object.attributes as LensAttributes,
      resolveResult.saved_object.references
    );
    const lensApiConfig = toLensApiConfig(lensAttributes);

    return {
      type: VISUALIZATION_SML_TYPE,
      data: {
        query: lensAttributes.title ?? item.origin_id,
        visualization: lensApiConfig as unknown as Record<string, unknown>,
        chart_type: toSupportedChartType(lensApiConfig.type),
        esql: extractEsqlFromLens(lensAttributes),
      },
    };
  },
};
