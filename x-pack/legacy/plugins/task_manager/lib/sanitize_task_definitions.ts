/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { TaskDefinition, TaskDictionary, validateTaskDefinition } from '../task';

/**
 * Sanitizes the system's task definitions. Task definitions have optional properties, and
 * this ensures they all are given a reasonable default.
 *
 * @param taskDefinitions - The Kibana task definitions dictionary
 */
export function sanitizeTaskDefinitions(
  taskDefinitions: TaskDictionary<TaskDefinition> = {}
): TaskDictionary<TaskDefinition> {
  return Object.keys(taskDefinitions).reduce((acc, type) => {
    const rawDefinition = taskDefinitions[type];
    rawDefinition.type = type;
    acc[type] = Joi.attempt(rawDefinition, validateTaskDefinition) as TaskDefinition;
    return acc;
  }, {} as TaskDictionary<TaskDefinition>);
}
