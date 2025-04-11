/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { NonEmptyString } from '@kbn/zod-helpers';

interface GroupBase {
  members: string[];
}

const groupBaseSchema: z.Schema<GroupBase> = z.object({
  members: z.array(NonEmptyString),
});

interface GroupStreamDefinitionBase {
  description: string;
  group: GroupBase;
}

const groupStreamDefinitionBaseSchema: z.Schema<GroupStreamDefinitionBase> = z.object({
  description: z.string(),
  group: groupBaseSchema,
});

interface GroupStreamDefinition {
  name: string;
  description: string;
  group: GroupBase;
}

const groupStreamDefinitionSchema: z.Schema<GroupStreamDefinition> = z.object({
  name: NonEmptyString,
  description: z.string(),
  group: groupBaseSchema,
});

export {
  groupBaseSchema,
  groupStreamDefinitionBaseSchema,
  groupStreamDefinitionSchema,
  type GroupBase,
  type GroupStreamDefinition,
  type GroupStreamDefinitionBase,
};
