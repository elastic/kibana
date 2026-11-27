/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowSettings } from '@kbn/workflows';

/** Default workflow `settings.timeout` when the definition omits it. */
export const DEFAULT_WORKFLOW_TIMEOUT = '6h';

export const defaultWorkflowSettings: WorkflowSettings = {
  timeout: DEFAULT_WORKFLOW_TIMEOUT,
};
