/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AtomicGraphNode } from '@kbn/workflows/graph';
import type { RunStepResult } from '../node_implementation';

/**
 * The graph node fields a custom step reads. Registered steps run on atomic nodes, and built-in
 * steps backed by a step definition (e.g. `workflow.awaitExecutions`) run on their own node type.
 */
export type CustomStepGraphNode = Pick<AtomicGraphNode, 'stepId' | 'stepType' | 'configuration'>;

export interface CustomStepDefinitionHandler {
  onCancel(input: unknown, rawInput: unknown, config: Record<string, unknown>): Promise<void>;
  run(input: unknown, rawInput: unknown, config: Record<string, unknown>): Promise<RunStepResult>;
}
