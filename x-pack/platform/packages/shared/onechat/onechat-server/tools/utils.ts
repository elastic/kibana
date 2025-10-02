/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomInt } from 'crypto';
import type { ErrorResult } from '@kbn/onechat-common';
import { ToolResultType } from '@kbn/onechat-common';

const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Generate a random id which can be used for tool result id.
 */
export function getToolResultId(): string {
  return Array.from({ length: 6 }, () => charset[randomInt(charset.length)]).join('');
}

export const createErrorResult = (message: string | ErrorResult['data']): ErrorResult => {
  return {
    tool_result_id: getToolResultId(),
    type: ToolResultType.error,
    data: typeof message === 'string' ? { message } : message,
  };
};
