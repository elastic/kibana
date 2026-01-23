/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceIdentifier } from 'inversify';
import type { RuleExecutionStep } from './types';

/**
 * Token for injecting the ordered steps array.
 */
export const RuleExecutionStepsToken = Symbol.for(
  'alerting_v2.RuleExecutionSteps'
) as ServiceIdentifier<RuleExecutionStep[]>;
