/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRulePipelineState } from '../test_utils';
import type { RuleExecutionMiddlewareContext } from './types';

export const createRuleExecutionMiddlewareContext = ({
  name,
}: { name?: string } = {}): RuleExecutionMiddlewareContext => ({
  step: { name: name ?? 'test_step', execute: jest.fn() },
  state: createRulePipelineState(),
});
