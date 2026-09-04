/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  VISUALIZATION_ATTACHMENT_TYPE,
  type ChartVisualizationAttachmentData,
  type VisualizationAttachmentData,
} from '@kbn/agent-builder-visualizations-common';
import type {
  AttachmentResolveContext,
  AttachmentTypeDefinition,
} from '@kbn/agent-builder-server/attachments';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import { isSavedObjectErrorResult } from '@kbn/core/server';
import {
  withLensReferences,
  toLensApiConfig,
  toSupportedChartType,
  extractEsqlFromLens,
} from '../lens_reference';
import { visualizationAttachmentDataSchema } from './visualization_schema';

/**
 * Creates the definition for the unified `visualization` attachment type.
 *
 * This type supports both:
 * - **By-value**: consumer provides content (`data`) directly.
 * - **By-reference**: consumer provides `origin` (a saved object ID string) →
 *   `resolve()` snapshots the content once at add time.
 *
 * After creation, all attachments behave identically — the agent doesn't know
 * whether something was originally by-reference.
 */
export const createVisualizationAttachmentType = (): AttachmentTypeDefinition<
  typeof VISUALIZATION_ATTACHMENT_TYPE,
  VisualizationAttachmentData
> => {
  return {
    id: VISUALIZATION_ATTACHMENT_TYPE,

    validate: (input) => {
      const parseResult = visualizationAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      }
      return { valid: false, error: parseResult.error.message };
    },

    resolve: async (
      origin: string,
      context: AttachmentResolveContext
      // Resolving a Lens saved object always yields a chart payload; custom content
      // has no by-reference form.
    ): Promise<ChartVisualizationAttachmentData | undefined> => {
      if (!context.savedObjectsClient) return undefined;

      try {
        const resolveResult = await context.savedObjectsClient.resolve('lens', origin);
        const savedObject = resolveResult.saved_object;

        if (isSavedObjectErrorResult(savedObject)) {
          return undefined;
        }

        const lensAttributes = withLensReferences(
          savedObject.attributes as LensAttributes,
          savedObject.references
        );

        const lensApiConfig = toLensApiConfig(lensAttributes);

        return {
          renderer: 'lens',
          query: origin,
          visualization: lensApiConfig as unknown as Record<string, unknown>,
          chart_type: toSupportedChartType(lensApiConfig.type),
          esql: extractEsqlFromLens(lensAttributes),
        };
      } catch {
        return undefined;
      }
    },

    format: (attachment) => ({
      getRepresentation: () => {
        const { data } = attachment;
        // Matched per renderer rather than falling through to Lens: a custom content
        // attachment described as Lens would send the agent down the wrong edit path.
        let kindLine: string;
        if (data.renderer === 'custom_content') {
          kindLine = 'Renderer: Custom content (HTML template)';
        } else if (data.renderer === 'vega') {
          kindLine = 'Renderer: Vega';
        } else if (data.chart_type) {
          kindLine = `Chart type: ${data.chart_type}`;
        } else {
          kindLine = 'Renderer: Lens';
        }
        return {
          type: 'text',
          value: [
            'Visualization attachment',
            `Query: ${data.query}`,
            kindLine,
            // Custom content is the only renderer that can be static.
            data.esql ? `ES|QL: ${data.esql}` : 'ES|QL: none (static content)',
          ].join('\n'),
        };
      },
    }),

    isReadonly: false,

    getAgentDescription: () => {
      return 'A visualization attachment contains a shared visualization payload and a renderer discriminator (lens, vega, or custom_content). Vega specs live at visualization.spec; custom content HTML templates live at visualization.template. Time range can be controlled by configuring a time_range property directly on the attachment.data with from and to fields. Rendering it inline displays the visualization as a dynamic, interactive chart component in the conversation UI. Visualization attachments can also be added to dashboard compositions through dashboard panel-ingestion operations.';
    },

    getTools: () => [],
  };
};
