/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiBadge } from '@elastic/eui';
import { CaseSeverity } from '../../../../../common/types/domain';
import { severities } from '../../../severity/config';

interface Props {
  severity: CaseSeverity;
}

const severityBadgeColors: Record<CaseSeverity, string> = {
  [CaseSeverity.LOW]: 'default',
  [CaseSeverity.MEDIUM]: 'warning',
  [CaseSeverity.HIGH]: 'danger',
  [CaseSeverity.CRITICAL]: 'danger',
};

export const SeverityBadge: React.FC<Props> = ({ severity }) => {
  return (
    <EuiBadge
      color={severityBadgeColors[severity]}
      data-test-subj={`case-severity-badge-${severity}`}
    >
      {severities[severity].label}
    </EuiBadge>
  );
};
SeverityBadge.displayName = 'SeverityBadge';
