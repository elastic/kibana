/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';

/**
 * Attachment type ID for saved objects.
 */
export const SAVED_OBJECT_ATTACHMENT_TYPE = 'saved_object';

/**
 * Schema for saved object attachment data.
 */
export const savedObjectAttachmentDataSchema = z.object({
  /**
   * The saved object ID.
   */
  id: z.string(),
  /**
   * The saved object type.
   */
  type: z.string(),
  /**
   * The saved object title/name.
   */
  title: z.string().optional(),
  /**
   * The saved object description.
   */
  description: z.string().optional(),
  /**
   * The space ID where the object exists.
   */
  spaceId: z.string().optional(),
  /**
   * Tags associated with the object.
   */
  tags: z.array(z.string()).optional(),
  /**
   * Created date.
   */
  createdAt: z.string().optional(),
  /**
   * Last updated date.
   */
  updatedAt: z.string().optional(),
  /**
   * The raw attributes (for display).
   */
  attributes: z.record(z.unknown()).optional(),
});

/**
 * Data for a saved object attachment.
 */
export type SavedObjectAttachmentData = z.infer<typeof savedObjectAttachmentDataSchema>;

/**
 * Common saved object types with their display names.
 */
const SAVED_OBJECT_TYPE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  visualization: 'Visualization',
  lens: 'Lens Visualization',
  map: 'Map',
  'index-pattern': 'Data View',
  search: 'Saved Search',
  canvas: 'Canvas Workpad',
  'infrastructure-ui-source': 'Metrics Source',
  'apm-indices': 'APM Indices',
  query: 'Saved Query',
  tag: 'Tag',
};

/**
 * Creates the definition for the `saved_object` attachment type.
 *
 * This attachment type is used for Kibana saved objects (dashboards, visualizations, etc.)
 * with capabilities to:
 * - View the object
 * - Update the object
 * - Duplicate the object
 */
export const createSavedObjectAttachmentType = (): AttachmentTypeDefinition<
  typeof SAVED_OBJECT_ATTACHMENT_TYPE,
  SavedObjectAttachmentData
> => {
  return {
    id: SAVED_OBJECT_ATTACHMENT_TYPE,

    validate: (input) => {
      const schemaResult = savedObjectAttachmentDataSchema.safeParse(input);
      if (!schemaResult.success) {
        return { valid: false, error: schemaResult.error.message };
      }
      return { valid: true, data: schemaResult.data };
    },

    format: (attachment) => ({
      getRepresentation: () => ({
        type: 'text',
        value: formatSavedObjectData(attachment.data),
      }),
    }),

    getTools: () => [platformCoreTools.savedObjects],

    getAgentDescription: () =>
      'A Kibana saved object is attached. You can view its details or perform operations on it.',

    // Skills to reference when this attachment is present
    skills: ['platform.saved_objects', 'platform.visualization'],

    // LLM guidance for saved object operations
    skillContent: `# Saved Object Operations

A Kibana saved object is attached to this conversation.

## Supported Object Types
- **Dashboard**: Collection of visualizations and panels
- **Visualization**: Single chart or graph
- **Lens**: Lens-based visualization
- **Data View**: Index pattern definition
- **Saved Search**: Discover saved search
- **Map**: Elastic Maps visualization
- **Canvas**: Canvas workpad

## Available Actions
- **View**: See the object's configuration and metadata
- **Update**: Modify the object's attributes (with confirmation)
- **Duplicate**: Create a copy of the object
- **Export**: Get the object definition for backup/sharing

## Best Practices
- Always verify the object type before operations
- Use duplication for experimentation
- Check space context for multi-space deployments
- Review tags for organization and discoverability

## Common Tasks
1. Check object metadata and configuration
2. Review visualization settings
3. Understand dashboard structure
4. Manage tags and organization`,

    // Entity recognition patterns for auto-attachment
    entityRecognition: {
      patterns: [
        /dashboard\s+["']?([a-zA-Z0-9_-]+)["']?/i,
        /visualization\s+["']?([a-zA-Z0-9_-]+)["']?/i,
        /saved\s+object\s+["']?([a-zA-Z0-9_-]+)["']?/i,
        /data\s+view\s+["']?([a-zA-Z0-9_-]+)["']?/i,
      ],
      extractId: (match) => match[1],
      resolve: async (entityId, context) => {
        // TODO: Implement resolution from saved objects client
        return null;
      },
    },
  };
};

/**
 * Formats saved object data for LLM representation.
 */
const formatSavedObjectData = (data: SavedObjectAttachmentData): string => {
  const parts: string[] = [];

  const typeLabel = SAVED_OBJECT_TYPE_LABELS[data.type] || data.type;
  const title = data.title || 'Untitled';

  parts.push(`## ${typeLabel}: ${title}`);
  parts.push(`**ID**: ${data.id}`);
  parts.push(`**Type**: ${data.type}`);

  if (data.spaceId) {
    parts.push(`**Space**: ${data.spaceId}`);
  }

  if (data.tags && data.tags.length > 0) {
    parts.push(`**Tags**: ${data.tags.join(', ')}`);
  }

  if (data.createdAt) {
    parts.push(`**Created**: ${data.createdAt}`);
  }

  if (data.updatedAt) {
    parts.push(`**Last Updated**: ${data.updatedAt}`);
  }

  if (data.description) {
    parts.push(`\n**Description**:\n${data.description}`);
  }

  if (data.attributes && Object.keys(data.attributes).length > 0) {
    parts.push('\n**Attributes**:');
    parts.push('```json');
    parts.push(JSON.stringify(data.attributes, null, 2));
    parts.push('```');
  }

  return parts.join('\n');
};
