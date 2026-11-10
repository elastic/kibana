/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { getStatusColor, getStatusLabel } from '../lib/task_status';

export const TaskStatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <EuiBadge color={getStatusColor(status)} data-test-subj="taskManagerUiStatusBadge">
    {getStatusLabel(status)}
  </EuiBadge>
);
