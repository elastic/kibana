/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_MEMORY_TYPE } from './entity_type';
import { FACT_MEMORY_TYPE } from './fact_type';
import type { LongTermMemoryTypeDefinition } from './long_term_types';
import { PROCEDURE_MEMORY_TYPE } from './procedure_type';
import { RELATIONSHIP_MEMORY_TYPE } from './relationship_type';

/** The long-term memory types dreaming maintains. */
export const LONG_TERM_MEMORY_TYPE_DEFINITIONS: readonly LongTermMemoryTypeDefinition[] = [
  FACT_MEMORY_TYPE,
  ENTITY_MEMORY_TYPE,
  PROCEDURE_MEMORY_TYPE,
  RELATIONSHIP_MEMORY_TYPE,
];

export const getLongTermMemoryTypeDefinition = (
  type: string
): LongTermMemoryTypeDefinition | undefined =>
  LONG_TERM_MEMORY_TYPE_DEFINITIONS.find((definition) => definition.type === type);
