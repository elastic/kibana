/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { formatDate } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AppHeaderMetadataItems } from '@kbn/app-header';

export interface UseScheduledRunMetadataArgs {
  packName?: string;
  executionCount?: number;
  timestamp?: string;
}

const SCHEDULED_RUN_OF_LABEL = i18n.translate(
  'xpack.osquery.queryDetailsHeader.scheduledRunOfLabel',
  {
    defaultMessage: 'Scheduled run of',
    description:
      'Label in the scheduled query results page header, followed by the pack name, e.g. "Scheduled run of my-pack".',
  }
);

const SCHEDULED_RUN_LABEL = i18n.translate('xpack.osquery.queryDetailsHeader.scheduledRunLabel', {
  defaultMessage: 'Scheduled run',
  description:
    'Label in the scheduled query results page header when the pack name is unavailable (pack deleted).',
});

const EXECUTION_LABEL = i18n.translate('xpack.osquery.queryDetailsHeader.executionLabel', {
  defaultMessage: 'Execution',
  description:
    'Label in the scheduled query results page header, followed by the execution number, e.g. "Execution #12".',
});

const ON_LABEL = i18n.translate('xpack.osquery.queryDetailsHeader.onLabel', {
  defaultMessage: 'on',
  description:
    'Label in the scheduled query results page header, followed by the date and time the scheduled query ran, e.g. "on 29 Oct 2026 12:00".',
});

/**
 * Three-item metadata row for a scheduled run's header: "Scheduled run of <pack>" ·
 * "Execution #N" · "on <date>" (falls back to "Scheduled run" when there is no pack name).
 * Same data `ScheduledRunSubtitle` rendered as a single sentence; split across the header's
 * metadata slots per design.
 */
export const useScheduledRunMetadata = ({
  packName,
  executionCount,
  timestamp,
}: UseScheduledRunMetadataArgs): AppHeaderMetadataItems =>
  useMemo(() => {
    // Rendered as a string so the count is not locale-formatted: execution 1152 is "#1152",
    // not "#1,152".
    const execution = executionCount != null ? `#${executionCount}` : undefined;
    const formattedTimestamp = timestamp ? formatDate(timestamp) : undefined;

    return [
      packName
        ? { type: 'text', label: SCHEDULED_RUN_OF_LABEL, value: packName }
        : { type: 'text', label: SCHEDULED_RUN_LABEL },
      { type: 'text', label: EXECUTION_LABEL, value: execution },
      { type: 'text', label: ON_LABEL, value: formattedTimestamp },
    ];
  }, [executionCount, packName, timestamp]);
