/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { NonEmptyString } from '@kbn/zod-helpers';
import { StreamDefinitionBase } from '../base';

interface GroupBase {
  members: string[];
}

const groupBaseSchema: z.Schema<GroupBase> = z.object({
  members: z.array(NonEmptyString),
});

interface GroupStreamDefinitionBase {
  group: GroupBase;
  description: string;
}

const groupStreamDefinitionSchemaBase: z.Schema<GroupStreamDefinitionBase> = z.object({
  group: groupBaseSchema,
  description: z.string(),
});

interface GroupStreamDefinition extends StreamDefinitionBase {
  group: GroupBase;
}

const groupStreamDefinitionSchema: z.Schema<GroupStreamDefinition> = z.intersection(
  z.object({ name: NonEmptyString }),
  groupStreamDefinitionSchemaBase
);

export {
  type GroupBase,
  type GroupStreamDefinitionBase,
  type GroupStreamDefinition,
  groupBaseSchema,
  groupStreamDefinitionSchema,
  groupStreamDefinitionSchemaBase,
};
