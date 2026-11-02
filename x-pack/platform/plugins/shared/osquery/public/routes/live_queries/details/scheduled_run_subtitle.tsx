/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, formatDate } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface ScheduledRunSubtitleProps {
  packName?: string;
  executionCount?: number;
  timestamp?: string;
}

const ScheduledRunSubtitleComponent: React.FC<ScheduledRunSubtitleProps> = ({
  packName,
  executionCount,
  timestamp,
}) => {
  const formattedTimestamp = timestamp ? formatDate(timestamp) : '';
  // Rendered as a string so the count is not locale-formatted: execution 1152 is
  // "#1152", not "#1,152".
  const execution = executionCount != null ? String(executionCount) : '';

  return (
    <EuiText size="s" color="subdued" data-test-subj="query-details-scheduled-run">
      {packName
        ? i18n.translate('xpack.osquery.queryDetailsHeader.scheduledRunWithPack', {
            defaultMessage:
              'Scheduled run of {packName} · Execution #{executionCount} on {timestamp}',
            values: { packName, executionCount: execution, timestamp: formattedTimestamp },
          })
        : i18n.translate('xpack.osquery.queryDetailsHeader.scheduledRun', {
            defaultMessage: 'Scheduled run · Execution #{executionCount} on {timestamp}',
            values: { executionCount: execution, timestamp: formattedTimestamp },
          })}
    </EuiText>
  );
};

ScheduledRunSubtitleComponent.displayName = 'ScheduledRunSubtitle';

export const ScheduledRunSubtitle = React.memo(ScheduledRunSubtitleComponent);
