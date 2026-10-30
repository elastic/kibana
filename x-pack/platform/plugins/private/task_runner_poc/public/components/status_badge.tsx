/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import type { ExecutionStatus, TaskStatus } from '../../common';

const COLORS: Record<TaskStatus, string> = {
  queued: 'hollow',
  running: 'primary',
  retrying: 'warning',
  succeeded: 'success',
  failed: 'danger',
  timed_out: 'danger',
  cancelled: 'default',
};

export const StatusBadge = ({ status }: { status: TaskStatus | ExecutionStatus }) => (
  <EuiBadge color={COLORS[status] ?? 'default'}>{status.replace('_', ' ')}</EuiBadge>
);
