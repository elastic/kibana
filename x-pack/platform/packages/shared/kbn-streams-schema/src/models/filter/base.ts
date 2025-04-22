/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { NonEmptyString } from '@kbn/zod-helpers';
import { StreamDefinitionBase } from '../base';
import { Condition, conditionSchema } from '../ingest/conditions';

interface FilterBase {
  source: string;
  filter: Condition;
}

const filterBaseSchema: z.Schema<FilterBase> = z.object({
  source: NonEmptyString,
  filter: conditionSchema,
});

interface FilterStreamDefinitionBase {
  filter: FilterBase;
}

const filterStreamDefinitionBaseSchema: z.Schema<FilterStreamDefinitionBase> = z.object({
  filter: filterBaseSchema,
});

type FilterStreamDefinition = StreamDefinitionBase & FilterStreamDefinitionBase;

const filterStreamDefinitionSchema: z.Schema<FilterStreamDefinition> = z.intersection(
  z.object({ name: NonEmptyString }),
  filterStreamDefinitionBaseSchema
);

export {
  type FilterBase,
  type FilterStreamDefinitionBase,
  type FilterStreamDefinition,
  filterBaseSchema,
  filterStreamDefinitionBaseSchema,
  filterStreamDefinitionSchema,
};
