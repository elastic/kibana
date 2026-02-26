/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionState } from '@kbn/agent-builder-genai-utils/tools/utils/workflows';

export type WorkflowExecutionResult =
  | { success: true; execution: WorkflowExecutionState }
  | { success: false; error: string };
