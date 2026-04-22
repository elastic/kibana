/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';

export const toToolError = (err: unknown) => ({
  results: [
    {
      type: ToolResultType.error,
      data: { message: err instanceof Error ? err.message : String(err) },
    },
  ],
});
