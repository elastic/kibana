/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createToken } from '@kbn/core-di';
import type { RuleExecutionStep } from './types';
import type { RuleExecutionMiddleware } from './middleware';

/**
 * Token for multi-injecting the ordered execution steps.
 * Binding order defines execution order.
 */
export const RuleExecutionStepsToken = createToken<RuleExecutionStep>(
  'alerting_v2.RuleExecutionSteps'
);

/**
 * Token for multi-injecting the ordered execution middlewares.
 */
export const RuleExecutionMiddlewaresToken = createToken<RuleExecutionMiddleware>(
  'alerting_v2.RuleExecutionMiddlewares'
);
