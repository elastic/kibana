/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionStatus } from '../../../../types';

export function isScheduledAction(
  action: Pick<ActionStatus, 'status'> & { startTime?: string }
): boolean {
  return (
    action.status === 'IN_PROGRESS' &&
    !!action.startTime &&
    new Date(action.startTime).getTime() > Date.now()
  );
}
