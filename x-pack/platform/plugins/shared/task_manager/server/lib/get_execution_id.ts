/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getExecutionId(executionId: string) {
  const executionIdParts = executionId.split('::');
  return executionIdParts.length > 0 ? executionIdParts[0] : executionId;
}
