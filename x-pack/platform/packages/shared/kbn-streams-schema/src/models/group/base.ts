/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { NonEmptyString } from '@kbn/zod-helpers';
import { StreamDefinitionBase } from '../base';

interface StreamRelationship {
  name: string;
  type: 'related' | 'member';
  filter?: string;
}

const streamRelationshipSchema = z.object({
  name: z.string(),
  type: z.union([z.literal('related'), z.literal('member')]),
  filter: z.string().optional(),
});

interface GroupBase {
  description?: string;
  category: string;
  owner: string;
  tier: 1 | 2 | 3 | 4;
  tags: string[];
  runbook_links: string[];
  documentation_links: string[];
  repository_links: string[];
  relationships: StreamRelationship[];
}

const groupBaseSchema: z.Schema<GroupBase> = z.object({
  description: z.optional(z.string()),
  category: z.string(),
  owner: z.string(),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  tags: z.array(z.string()),
  runbook_links: z.array(z.string()),
  documentation_links: z.array(z.string()),
  repository_links: z.array(z.string()),
  relationships: z.array(streamRelationshipSchema),
});

interface GroupStreamDefinitionBase extends StreamDefinitionBase {
  group: GroupBase;
}

const groupStreamDefinitionBaseSchema: z.Schema<GroupStreamDefinitionBase> = z.intersection(
  z.object({
    name: NonEmptyString,
  }),
  z.object({
    group: groupBaseSchema,
  })
);

type GroupStreamDefinition = StreamDefinitionBase & GroupStreamDefinitionBase;

const groupStreamDefinitionSchema: z.Schema<GroupStreamDefinition> = z.intersection(
  z.object({ name: NonEmptyString }),
  groupStreamDefinitionBaseSchema
);

export {
  type GroupBase,
  type GroupStreamDefinitionBase,
  type GroupStreamDefinition,
  groupBaseSchema,
  groupStreamDefinitionBaseSchema,
  groupStreamDefinitionSchema,
};
