/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum AgentExecutionErrorCode {
  contextLengthExceeded = 'context_length_exceeded',
  toolNotFound = 'tool_not_found',
  toolValidationError = 'tool_validation_error',
  unknownError = 'unknown_error',
  invalidState = 'invalid_state',
}
