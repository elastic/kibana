/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useEuiTheme } from '@elastic/eui';
import type { EnhancedFailureStoreStats } from '../hooks/use_data_stream_stats';
import type { useFailureStoreConfig } from '../hooks/use_failure_store_config';
import { formatBytes } from '../helpers/format_bytes';
import {
  DataLifecycleSummary,
  buildLifecyclePhases,
  type LifecyclePhase,
} from '../common/data_lifecycle/data_lifecycle_summary';

interface FailureStoreSummaryProps {
  stats?: EnhancedFailureStoreStats;
  failureStoreConfig: ReturnType<typeof useFailureStoreConfig>;
}

export const FailureStoreSummary = ({ stats, failureStoreConfig }: FailureStoreSummaryProps) => {
  const { euiTheme } = useEuiTheme();

  const storageSize = useMemo(() => {
    if (!stats?.size) return undefined;
    return formatBytes(stats.size);
  }, [stats]);

  const retentionPeriod = useMemo(() => {
    if (failureStoreConfig.retentionDisabled) {
      return undefined;
    }
    return failureStoreConfig.customRetentionPeriod ?? failureStoreConfig.defaultRetentionPeriod;
  }, [failureStoreConfig]);

  const phases: LifecyclePhase[] = useMemo(() => {
    return buildLifecyclePhases({
      label: i18n.translate('xpack.streams.streamDetailLifecycle.failedIngest', {
        defaultMessage: 'Failed ingest',
      }),
      color: euiTheme.colors.severity.danger,
      size: storageSize,
      retentionPeriod,
    });
  }, [euiTheme, storageSize, retentionPeriod]);

  return <DataLifecycleSummary phases={phases} />;
};
