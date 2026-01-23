/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceIdentifier } from 'inversify';
import type { RuleExecutionStep } from './types';
import type { RuleExecutionMiddleware } from './middleware';

/**
 * Token for injecting the ordered steps array.
 */
export const RuleExecutionStepsToken = Symbol.for(
  'alerting_v2.RuleExecutionSteps'
) as ServiceIdentifier<RuleExecutionStep[]>;

/**
 * DI token for the array of step middleware.
 * Middleware are executed in order (first middleware is outermost).
 */
export const RuleExecutionMiddlewaresToken = Symbol.for(
  'alerting_v2.RuleExecutionMiddlewares'
) as ServiceIdentifier<RuleExecutionMiddleware[]>;
