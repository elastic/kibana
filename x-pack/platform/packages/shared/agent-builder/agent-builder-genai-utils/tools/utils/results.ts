/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolHandlerResult } from '@kbn/agent-builder-server/tools';
import type { ErrorResult, OtherResult } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common';

export const errorResult = (
  error: string,
  metadata?: Record<string, unknown>
): ToolHandlerResult<ErrorResult> => {
  return {
    type: ToolResultType.error,
    data: {
      message: error,
      metadata,
    },
  };
};

export const otherResult = (data: Record<string, unknown>): ToolHandlerResult<OtherResult> => {
  return {
    type: ToolResultType.other,
    data,
  };
};

export const isErrorResult = (
  result: ToolHandlerResult
): result is ToolHandlerResult<ErrorResult> => {
  return result.type === ToolResultType.error;
};

export const isOtherResult = (
  result: ToolHandlerResult
): result is ToolHandlerResult<OtherResult> => {
  return result.type === ToolResultType.other;
};
