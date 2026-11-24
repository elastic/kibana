/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowEventsValue } from '@kbn/workflows';

/**
 * Resolves `on.workflowEvents` the same way event-driven scheduling does: unknown or omitted -> `avoid-loop`.
 */
export function resolveWorkflowEventsModeFromOn(
  on: Record<string, unknown> | null | undefined
): WorkflowEventsValue {
  const raw = on?.workflowEvents;
  if (raw === 'ignore' || raw === 'allow-all' || raw === 'avoid-loop') {
    return raw;
  }
  return 'avoid-loop';
}
