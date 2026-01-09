/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType, platformCoreTools } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { taggableTypes } from '@kbn/saved-objects-tagging-plugin/common/constants';
import { updateTagReferences } from '@kbn/saved-objects-tagging-plugin/common/references';

const tagAttributesSchema = z.object({
  name: z.string().min(1).describe('Tag name'),
  description: z.string().optional().describe('Optional tag description'),
  color: z.string().optional().describe('Optional hex color, e.g. "#00BFB3"'),
});

const schema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('list'), params: z.object({}) }),
  z.object({
    operation: z.literal('get'),
    params: z.object({ id: z.string().min(1).describe('Tag id') }),
  }),
  z.object({
    operation: z.literal('create'),
    params: tagAttributesSchema.extend({
      confirm: z.literal(true).describe('Required for create. Set to true only if the user confirmed.'),
    }),
  }),
  z.object({
    operation: z.literal('update'),
    params: z
      .object({
        id: z.string().min(1).describe('Tag id'),
      })
      .and(
        tagAttributesSchema.partial().extend({
          confirm: z.literal(true).describe('Required for update. Set to true only if the user confirmed.'),
        })
      ),
  }),
  z.object({
    operation: z.literal('update_object_tags'),
    params: z.object({
      object: z.object({
        type: z.string().min(1).describe('Saved object type to tag'),
        id: z.string().min(1).describe('Saved object id to tag'),
      }),
      addTagIds: z.array(z.string().min(1)).optional().default([]),
      removeTagIds: z.array(z.string().min(1)).optional().default([]),
      confirm: z
        .literal(true)
        .describe('Required for updating object tags. Set to true only if the user confirmed.'),
    }),
  }),
]);

export const tagsTool = ({
  coreSetup,
}: {
  coreSetup: any;
}): BuiltinToolDefinition<typeof schema> => {
  return {
    id: platformCoreTools.tags,
    type: ToolType.builtin,
    description:
      'List/get/create/update tags and assign/unassign tags to saved objects (no delete). Write operations require confirm.',
    schema,
    handler: async (input, { request }) => {
      const [coreStart, pluginsStart] = await coreSetup.getStartServices();
      const savedObjectsTagging = pluginsStart.savedObjectsTagging;
      if (!savedObjectsTagging) {
        return { results: [{ type: 'error', data: { message: 'savedObjectsTagging plugin not available' } }] };
      }

      const soClient = coreStart.savedObjects.getScopedClient(request);
      const tagsClient = savedObjectsTagging.createTagClient({ client: soClient });

      switch (input.operation) {
        case 'list': {
          const tags = await tagsClient.getAll();
          return { results: [{ type: 'other', data: { operation: 'list', items: tags } }] };
        }
        case 'get': {
          const tag = await tagsClient.get(input.params.id);
          return { results: [{ type: 'other', data: { operation: 'get', item: tag } }] };
        }
        case 'create': {
          const tag = await tagsClient.create({
            name: input.params.name,
            description: input.params.description,
            color: input.params.color,
          } as any);
          return { results: [{ type: 'other', data: { operation: 'create', item: tag } }] };
        }
        case 'update': {
          const current = await tagsClient.get(input.params.id);
          const updated = await tagsClient.update(input.params.id, {
            name: input.params.name ?? current.name,
            description: input.params.description ?? current.description,
            color: input.params.color ?? current.color,
          } as any);
          return { results: [{ type: 'other', data: { operation: 'update', item: updated } }] };
        }
        case 'update_object_tags': {
          const { type, id } = input.params.object;
          if (!taggableTypes.includes(type)) {
            return {
              results: [
                {
                  type: 'error',
                  data: {
                    message: `Saved object type '${type}' is not taggable. Supported types: ${taggableTypes.join(
                      ', '
                    )}`,
                  },
                },
              ],
            };
          }

          const current = await soClient.get(type, id);
          const newReferences = updateTagReferences({
            references: current.references ?? [],
            toAdd: input.params.addTagIds,
            toRemove: input.params.removeTagIds,
          });

          const res = await soClient.update(type, id, current.attributes as any, {
            version: current.version,
            references: newReferences,
          });

          return { results: [{ type: 'other', data: { operation: 'update_object_tags', item: res } }] };
        }
      }
    },
    tags: [],
  };
};


