/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, useEuiTheme } from '@elastic/eui';
import type { CaseAttachmentData } from '../../../common/types/agent_builder/attachment_schemas';
import { CRITICAL, HIGH, LOW, MEDIUM } from '../../components/severity/translations';

type Severity = CaseAttachmentData['severity'];

interface Props {
  severity: Severity;
}

export const SeverityBadge: React.FC<Props> = ({ severity }) => {
  const { euiTheme } = useEuiTheme();
  const config: Record<Severity, { label: string; color: string }> = {
    low: { label: LOW, color: euiTheme.colors.severity.neutral },
    medium: { label: MEDIUM, color: euiTheme.colors.severity.warning },
    high: { label: HIGH, color: euiTheme.colors.severity.risk },
    critical: { label: CRITICAL, color: euiTheme.colors.severity.danger },
  };
  const { label, color } = config[severity];
  return (
    <EuiBadge color={color} data-test-subj={`case-attachment-severity-${severity}`}>
      {label}
    </EuiBadge>
  );
};
SeverityBadge.displayName = 'SeverityBadge';
