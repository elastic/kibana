/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VisualizationRefAttachmentData } from '@kbn/agent-builder-common/attachments';
import {
  AttachmentType,
  visualizationRefAttachmentDataSchema,
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
 * Creates the definition for the `visualization_ref` attachment type.
 *
 * This attachment type represents a reference to a saved Lens visualization object.
 * It stores the saved object ID and type,
 * with optional cached metadata (title, description).
 *
 * The referenced content is resolved on-demand on the server (e.g. via attachment_read tool).
 */
export const createVisualizationRefAttachmentType = (): AttachmentTypeDefinition<
  AttachmentType.visualizationRef,
  VisualizationRefAttachmentData
> => {
  return {
    id: AttachmentType.visualizationRef,
    validate: (input) => {
      const parseResult = visualizationRefAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      } else {
        return { valid: false, error: parseResult.error.message };
      }
    },
    format: (attachment) => ({
      getRepresentation: () => ({
        // Keep formatting minimal; generic by-ref messaging is added centrally.
        type: 'text',
        value: JSON.stringify(attachment.data, null, 2),
      }),
    }),
    resolve: async (attachment, context: AttachmentResolveContext) => {
      // Allow this type to be used in environments where SO client isn't available.
      if (!context.savedObjectsClient) return undefined;

      const { saved_object_id } = attachment.data;

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

        return toLensApiConfig(lensAttributes);
      } catch (error) {
        return undefined;
      }
    },
    getAgentDescription: () => {
      return `A visualization_ref attachment contains a reference to a saved Lens visualization. The reference includes the saved object ID and type. Use attachment_read to resolve the referenced content when needed.`;
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
