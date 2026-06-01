/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceIdentifier } from 'inversify';
import type { DispatcherStep } from '../types';

/**
 * Token for multi-injecting the ordered dispatcher execution steps.
 * Binding order defines execution order.
 */
export const DispatcherExecutionStepsToken = Symbol.for(
  'alerting_v2.DispatcherExecutionSteps'
) as ServiceIdentifier<DispatcherStep>;
