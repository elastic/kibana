/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import type { StandingSessionStatus } from '@kbn/agent-builder-common';

interface Props {
  status: StandingSessionStatus;
}

const colorMap: Record<StandingSessionStatus, string> = {
  idle: 'default',
  active: 'success',
  terminated: 'danger',
};

export const SessionStatusBadge: React.FC<Props> = ({ status }) => {
  return <EuiBadge color={colorMap[status]}>{status}</EuiBadge>;
};
