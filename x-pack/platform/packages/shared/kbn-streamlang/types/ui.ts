/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangProcessorDefinition } from './processors';
import type { ConditionWithSteps, StreamlangConditionBlock } from './streamlang';

/** Which branch of a parent condition block a step belongs to: main (if) vs else. */
export type StreamlangUIBranch = 'if' | 'else';

export interface UIAttributes {
  /* Denotes which condition block is the parent of this block, this can be used
    to represent hierarchy within a UI. Null indicates that this block is top level
    and has no parent. */
  parentId: string | null;
  /* Usually an optional property within Streamlang blocks, but in the UI we will always
  assign and use these */
  customIdentifier: string;
  /* Indicates which branch of a parent condition block this step belongs to.
  'if' for the main branch (default), 'else' for the else branch. */
  branch?: StreamlangUIBranch;
}

export type StreamlangProcessorDefinitionWithUIAttributes = StreamlangProcessorDefinition &
  UIAttributes;

export type StreamlangConditionWithoutSteps = Omit<ConditionWithSteps, 'steps' | 'else'>;
export type StreamlangConditionBlockWithUIAttributes = Omit<
  StreamlangConditionBlock,
  'condition'
> & {
  condition: StreamlangConditionWithoutSteps;
} & UIAttributes;

export type StreamlangStepWithUIAttributes =
  | StreamlangProcessorDefinitionWithUIAttributes
  | StreamlangConditionBlockWithUIAttributes;
