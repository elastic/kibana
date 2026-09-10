/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiText, formatDate } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

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

  const withPackValues = useMemo(
    () => ({ packName, executionCount, timestamp: formattedTimestamp }),
    [packName, executionCount, formattedTimestamp]
  );
  const withoutPackValues = useMemo(
    () => ({ executionCount, timestamp: formattedTimestamp }),
    [executionCount, formattedTimestamp]
  );

  return (
    <EuiText size="s" color="subdued" data-test-subj="query-details-scheduled-run">
      {packName ? (
        <FormattedMessage
          id="xpack.osquery.queryDetailsHeader.scheduledRunWithPack"
          defaultMessage="Scheduled run of {packName} · Execution #{executionCount} on {timestamp}"
          values={withPackValues}
        />
      ) : (
        <FormattedMessage
          id="xpack.osquery.queryDetailsHeader.scheduledRun"
          defaultMessage="Scheduled run · Execution #{executionCount} on {timestamp}"
          values={withoutPackValues}
        />
      )}
    </EuiText>
  );
};

ScheduledRunSubtitleComponent.displayName = 'ScheduledRunSubtitle';

export const ScheduledRunSubtitle = React.memo(ScheduledRunSubtitleComponent);
