/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunStepResult } from '../node_implementation';

export interface CustomStepDefinitionHandler {
  onCancel(input: unknown, rawInput: unknown, config: Record<string, unknown>): Promise<void>;
  run(input: unknown, rawInput: unknown, config: Record<string, unknown>): Promise<RunStepResult>;
}
