/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConcreteTaskInstance, TaskDefinition } from '../task';
export declare function getRetryAt(
  task: ConcreteTaskInstance,
  taskDefinition: TaskDefinition | undefined
): Date | undefined;
export declare function getRetryDate({
  error,
  attempts,
  addDuration,
}: {
  error: Error;
  attempts: number;
  addDuration?: string;
}): Date | undefined;
export declare function calculateDelayBasedOnAttempts(attempts: number): number;
export declare function getTimeout(
  task: ConcreteTaskInstance,
  taskDefinition: TaskDefinition | undefined
): string;
