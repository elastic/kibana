/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

const REFERENCED_CONTENT_SCHEMA = schema.arrayOf(
  schema.object({
    name: schema.string({
      meta: { description: 'Name of the referenced content.' },
    }),
    relativePath: schema.string({
      meta: { description: 'Relative path of the referenced content.' },
    }),
    content: schema.string({
      meta: { description: 'Content of the reference.' },
    }),
  })
);

export const skillIdParamSchema = schema.object({
  skillId: schema.string({
    meta: { description: 'The unique identifier of the skill.' },
  }),
});

export const createSkillBodySchema = schema.object({
  id: schema.string({
    meta: { description: 'Unique identifier for the skill.' },
  }),
  name: schema.string({
    meta: { description: 'Human-readable name for the skill.' },
  }),
  description: schema.string({
    meta: { description: 'Description of what the skill does.' },
  }),
  content: schema.string({
    meta: { description: 'Skill instructions content (markdown).' },
  }),
  referenced_content: schema.maybe(REFERENCED_CONTENT_SCHEMA),
  tool_ids: schema.arrayOf(
    schema.string({
      meta: { description: 'Tool ID from the tool registry.' },
    }),
    {
      defaultValue: [],
      meta: {
        description: 'Tool IDs from the tool registry that this skill references.',
      },
    }
  ),
});

export const updateSkillBodySchema = schema.object({
  name: schema.maybe(
    schema.string({
      meta: { description: 'Updated name for the skill.' },
    })
  ),
  description: schema.maybe(
    schema.string({
      meta: { description: 'Updated description.' },
    })
  ),
  content: schema.maybe(
    schema.string({
      meta: { description: 'Updated skill instructions content.' },
    })
  ),
  referenced_content: schema.maybe(REFERENCED_CONTENT_SCHEMA),
  tool_ids: schema.maybe(
    schema.arrayOf(
      schema.string({
        meta: { description: 'Updated tool ID.' },
      }),
      {
        meta: { description: 'Updated tool IDs from the tool registry.' },
      }
    )
  ),
});
