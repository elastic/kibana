/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createErrorResult, createOtherResult } from '@kbn/agent-builder-server';
import {
  AttachmentType,
  a2uiComponentSchema,
  KIBANA_EUI_CATALOG_ID,
  A2UIComponentType,
} from '@kbn/agent-builder-common/attachments';

const A2UI_SURFACE_ATTACHMENT_TYPE = AttachmentType.a2uiSurface;

const createA2UISurfaceSchema = z.object({
  surface_id: z.string().describe('Unique identifier for this surface within the conversation.'),
  title: z
    .string()
    .optional()
    .describe('Display title shown in the attachment pill and surface header.'),
  components: z
    .array(a2uiComponentSchema)
    .describe(
      'Flat adjacency list of A2UI component objects. Exactly one must have id "root". ' +
        'Each component has: id, component (type name), and type-specific props. ' +
        'Container components reference children by id.'
    ),
  data_model: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      'Key-value data model for data-bound components. Components reference values via ' +
        'JSON Pointer paths (RFC 6901), e.g. {"path": "/cpu_percent"}.'
    ),
  attachment_id: z
    .string()
    .optional()
    .describe(
      '(optional) ID of an existing a2ui_surface attachment to update. ' +
        'If provided, the tool updates that attachment instead of creating a new one.'
    ),
});

const componentTypeList = Object.values(A2UIComponentType).join(', ');

export const createA2UISurfaceTool = (): BuiltinToolDefinition<typeof createA2UISurfaceSchema> => {
  return {
    id: platformCoreTools.createA2UISurface,
    type: ToolType.builtin,
    description:
      `Create or update a declarative A2UI surface that renders as rich, interactive UI inline in the conversation.\n\n` +
      `This tool builds structured layouts from EUI components without writing code. ` +
      `The agent assembles a component tree as a flat adjacency list, and the client renders it as live EUI components.\n\n` +
      `Supported component types: ${componentTypeList}.\n\n` +
      `Component reference:\n` +
      `- Text: {text, variant ("title"|"body"|"caption")}\n` +
      `- Row/Column: {children (array of component ids), align, justify}\n` +
      `- Card: {child (single component id), title}\n` +
      `- Stat: {title (label), value (number/string), description}\n` +
      `- Table: {columns [{field, name}], data_path (JSON Pointer to array in data_model)}\n` +
      `- DescriptionList: {items [{title, description}]}\n` +
      `- Button: {text, action {event: {name, context}}, variant ("primary"|"default")}\n` +
      `- Divider: {size ("s"|"m"|"l")}\n` +
      `- Icon: {name (EUI icon name), color, size}\n` +
      `- Badge: {text, color}\n` +
      `- VisualizationRef: {attachment_id, version}\n` +
      `- FieldValue: {field_name, field_value}\n\n` +
      `Any string property accepts data binding via {path: "/pointer"} resolved against data_model.\n\n` +
      `After the tool returns an attachment_id, render it inline with <render_attachment id="ATTACHMENT_ID">.`,
    schema: createA2UISurfaceSchema,
    tags: [],
    handler: async (
      {
        surface_id: surfaceId,
        title,
        components,
        data_model: dataModel,
        attachment_id: attachmentId,
      },
      { logger, attachments }
    ) => {
      try {
        const surfaceData = {
          surface_id: surfaceId,
          catalog_id: KIBANA_EUI_CATALOG_ID,
          components,
          ...(dataModel !== undefined && { data_model: dataModel }),
          ...(title !== undefined && { title }),
        };

        let resultAttachmentId: string | undefined;
        let version: number | undefined;
        let isUpdate = false;

        if (attachmentId && attachments.getAttachmentRecord(attachmentId)) {
          const updated = await attachments.update(attachmentId, {
            data: surfaceData,
            description: `A2UI Surface: ${title ?? surfaceId}`,
          });
          resultAttachmentId = attachmentId;
          version = updated?.current_version ?? 1;
          isUpdate = true;
          logger.debug(`Updated A2UI surface attachment ${attachmentId} to version ${version}`);
        } else {
          const newAttachment = await attachments.add({
            type: A2UI_SURFACE_ATTACHMENT_TYPE,
            data: surfaceData,
            description: `A2UI Surface: ${title ?? surfaceId}`,
          });
          resultAttachmentId = newAttachment.id;
          version = newAttachment.current_version;
          logger.debug(`Created new A2UI surface attachment ${resultAttachmentId}`);
        }

        return {
          results: [
            createOtherResult({
              surface_id: surfaceId,
              title: title ?? surfaceId,
              component_count: components.length,
              attachment_id: resultAttachmentId,
              version,
              is_update: isUpdate,
            }),
          ],
        };
      } catch (error) {
        logger.error(`Error in create_a2ui_surface tool: ${error.message}`);
        return {
          results: [createErrorResult(`Failed to create A2UI surface: ${error.message}`)],
        };
      }
    },
  };
};
