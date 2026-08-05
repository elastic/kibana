/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiToolTip } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import { formatTimestamp } from './entries';

export interface AlertEpisodeTimelineRelativeTimestampProps {
  timestamp: string;
}

/** Renders a relative time (e.g. "5 minutes ago") with the full timestamp on hover. */
export const AlertEpisodeTimelineRelativeTimestamp = ({
  timestamp,
}: AlertEpisodeTimelineRelativeTimestampProps) => (
  <EuiToolTip content={formatTimestamp(timestamp)}>
    <span data-test-subj="alertingV2TimelineRelativeTimestamp">
      <FormattedRelative value={timestamp} />
    </span>
  </EuiToolTip>
);
