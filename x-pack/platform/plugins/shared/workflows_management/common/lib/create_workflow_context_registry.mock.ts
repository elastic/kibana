/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowContextRegistry } from '@kbn/workflows-yaml';

/** Registry that resolves nothing, for tests that do not depend on registered step or trigger metadata. */
export const createMockWorkflowContextRegistry = (
  overrides: Partial<WorkflowContextRegistry> = {}
): WorkflowContextRegistry => ({
  getStepOutput: () => undefined,
  getConnector: () => undefined,
  getTriggerDefinition: () => undefined,
  ...overrides,
});
