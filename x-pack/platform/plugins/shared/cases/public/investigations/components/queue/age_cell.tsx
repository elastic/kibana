/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiToolTip } from '@elastic/eui';
import { getPausedSeconds } from '../../../../common/investigations/statuses';
import type { InvestigationRecord } from '../../../../common/investigations/types';
import { formatDuration } from '../shared/formatters';
import { useNow } from '../shared/use_now';
import * as i18n from './translations';

/**
 * How long the investigation has been worked on: time since it was created (or until it was
 * closed) without the time spent in statuses that pause time tracking.
 */
export const getAgeMs = (
  record: Pick<InvestigationRecord, 'created_at' | 'closed_at' | 'paused_at' | 'time_paused'>,
  now: number
): number => {
  const created = Date.parse(record.created_at);
  if (Number.isNaN(created)) return 0;
  const closed = record.closed_at ? Date.parse(record.closed_at) : NaN;
  const end = Number.isNaN(closed) ? now : closed;
  return Math.max(0, end - created - getPausedSeconds(record, end) * 1000);
};

export interface AgeCellProps {
  record: InvestigationRecord;
}

export const AgeCell: React.FC<AgeCellProps> = ({ record }) => {
  const now = useNow();
  const ageMs = getAgeMs(record, now);

  return (
    <EuiToolTip content={i18n.AGE_TOOLTIP}>
      <span
        tabIndex={0}
        data-age-ms={ageMs}
        data-test-subj={`investigationAge-${record.display_id}`}
      >
        {formatDuration(ageMs)}
      </span>
    </EuiToolTip>
  );
};
AgeCell.displayName = 'AgeCell';
