/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolHandlerResult } from '@kbn/agent-builder-server/tools';
import { ToolResultType } from '@kbn/agent-builder-common';

export const errorResult = (error: string): ToolHandlerResult => {
  return {
    type: ToolResultType.error,
    data: {
      message: error,
    },
  };
};

export const otherResult = (data: Record<string, unknown>): ToolHandlerResult => {
  return {
    type: ToolResultType.other,
    data,
  };
};
