/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionListItemDto } from '@kbn/workflows';

export const getStreamNameFromExecution = (
  exec: WorkflowExecutionListItemDto
): string | undefined => {
  const { context } = exec;
  if (context == null || typeof context !== 'object') return undefined;
  const inputs = 'inputs' in context ? context.inputs : undefined;
  if (inputs == null || typeof inputs !== 'object') return undefined;
  const streamName = 'streamName' in inputs ? inputs.streamName : undefined;
  return typeof streamName === 'string' ? streamName : undefined;
};

export const streamNamePredicate = (name: string) => {
  return (exec: WorkflowExecutionListItemDto) => getStreamNameFromExecution(exec) === name;
};
