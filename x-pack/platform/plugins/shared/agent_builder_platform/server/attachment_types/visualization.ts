/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  VisualizationAttachmentData,
  VisualizationOriginData,
} from '@kbn/agent-builder-common/attachments';
import {
  AttachmentType,
  visualizationAttachmentDataSchema,
  visualizationOriginDataSchema,
} from '@kbn/agent-builder-common/attachments';
import type {
  AttachmentResolveContext,
  AttachmentTypeDefinition,
} from '@kbn/agent-builder-server/attachments';
import {
  LensConfigBuilder,
  type LensApiSchemaType,
  type LensAttributes,
} from '@kbn/lens-embeddable-utils/config_builder';

/**
 * Creates the definition for the unified `visualization` attachment type.
 *
 * This type supports both:
 * - **By-value**: consumer provides content (`data`) directly.
 * - **By-reference**: consumer provides `origin` (e.g., `{ saved_object_id }`) →
 *   `resolve()` snapshots the content once at add time.
 *
 * After creation, all attachments behave identically — the agent doesn't know
 * whether something was originally by-reference.
 */
export const createVisualizationAttachmentType = (): AttachmentTypeDefinition<
  AttachmentType.visualization,
  VisualizationAttachmentData,
  VisualizationOriginData
> => {
  return {
    id: AttachmentType.visualization,

    validate: (input) => {
      const parseResult = visualizationAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      }
      return { valid: false, error: parseResult.error.message };
    },

    validateOrigin: (input) => {
      const parseResult = visualizationOriginDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      }
      return { valid: false, error: parseResult.error.message };
    },

    resolve: async (
      origin: VisualizationOriginData,
      context: AttachmentResolveContext
    ): Promise<VisualizationAttachmentData | undefined> => {
      if (!context.savedObjectsClient) return undefined;

      const { saved_object_id } = origin;

      try {
        const resolveResult = await context.savedObjectsClient.resolve('lens', saved_object_id);
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
          query: origin.title ?? saved_object_id,
          visualization: lensApiConfig as unknown as Record<string, unknown>,
          chart_type: extractChartType(lensAttributes),
          esql: extractEsql(lensAttributes),
        };
      } catch {
        return undefined;
      }
    },

    format: (attachment) => ({
      getRepresentation: () => ({
        type: 'text',
        value: [
          'Visualization attachment',
          `Query: ${attachment.data.query}`,
          `Chart type: ${attachment.data.chart_type}`,
          `ES|QL: ${attachment.data.esql}`,
        ].join('\n'),
      }),
    }),

    isReadonly: false,

    getAgentDescription: () => {
      return 'A visualization attachment contains a Lens visualization configuration. It can be rendered inline using <render_attachment id="..." />.';
    },

    getTools: () => [],
  };
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

const extractChartType = (attributes: LensAttributes): string => {
  try {
    const state = attributes.state;
    if (state?.visualization && typeof state.visualization === 'object') {
      const vizState = state.visualization as Record<string, unknown>;
      if (typeof vizState.preferredSeriesType === 'string') {
        return vizState.preferredSeriesType;
      }
    }
    return attributes.visualizationType ?? 'unknown';
  } catch {
    return 'unknown';
  }
};

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
