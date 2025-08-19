/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangProcessorDefinition } from './processors';
import type { ConditionWithSteps, StreamlangWhereBlock } from './streamlang';

interface UIAttributes {
  /* Denotes which Where block is the parent of this block, this can be used
    to represent hierarchy within a UI. Null indicates that this block is top level
    and has no parent. */
  parentId: string | null;
}

export type WithUiAttributes<T> = T & UIAttributes;

export type StreamlangProcessorDefinitionWithUIAttributes = StreamlangProcessorDefinition &
  UIAttributes;

export type StreamlangConditionWithoutSteps = Omit<ConditionWithSteps, 'steps'>;
export type StreamlangWhereBlockWithUIAttributes = Omit<StreamlangWhereBlock, 'where'> & {
  where: StreamlangConditionWithoutSteps;
} & UIAttributes;

export type StreamlangStepWithUIAttributes =
  | StreamlangProcessorDefinitionWithUIAttributes
  | StreamlangWhereBlockWithUIAttributes;

export type StreamlangStepWithUIAttributesWithCustomIdentifier = StreamlangStepWithUIAttributes & {
  customIdentifier: string;
};
