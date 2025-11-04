/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  isToolNotFoundError,
  isToolValidationError,
  isContextLengthExceededError,
} from '@kbn/inference-common/src/chat_complete/errors';
import { AgentExecutionErrorCode as ErrCodes } from '@kbn/onechat-common/agents';
import { createAgentExecutionError } from '@kbn/onechat-common/base/errors';

const recoverableErrorCodes = [ErrCodes.toolNotFound, ErrCodes.toolValidationError];

/**
 * Converts an error which occurred during the execution of the agent to our error format.
 * Also categories the error to identifiable error codes.
 * @param error
 */
export const categorizeError = (error: Error): ErrCodes => {
  if (isToolNotFoundError(error)) {
    return ErrCodes.toolNotFound;
  } else if (isToolValidationError(error)) {
    return ErrCodes.toolValidationError;
  } else if (isContextLengthExceededError(error)) {
    return ErrCodes.contextLengthExceeded;
  } else {
    return ErrCodes.unknownError;
  }
};

export const isRecoverableErrorCode = (code: ErrCodes): boolean => {
  return recoverableErrorCodes.includes(code);
};

export const createExecutionError = (code: ErrCodes, message: string) => {
  return createAgentExecutionError(message, {
    code,
  });
};
