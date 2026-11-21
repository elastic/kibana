/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import type { InvestigationStatus } from '../../../../common/investigations/types';
import { statuses as caseStatusConfig } from '../../../components/status/config';

export interface StatusLabelBadgeProps {
  /** The status label as configured, for example "Waiting on the employee". */
  label: string;
  /** The category sets the colour and icon, the same ones the Cases statuses use. */
  category: InvestigationStatus;
  'data-test-subj'?: string;
}

/** A status label in the colour of its category. */
export const StatusLabelBadge: React.FC<StatusLabelBadgeProps> = ({
  label,
  category,
  'data-test-subj': dataTestSubj,
}) => {
  const { color, icon } = caseStatusConfig[category];

  return (
    <EuiBadge color={color} iconType={icon} data-test-subj={dataTestSubj}>
      {label}
    </EuiBadge>
  );
};
StatusLabelBadge.displayName = 'StatusLabelBadge';
