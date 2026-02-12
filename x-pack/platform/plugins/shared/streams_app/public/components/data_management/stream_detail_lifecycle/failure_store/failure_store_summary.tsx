/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { useEuiTheme } from '@elastic/eui';
import { useKibana } from '../../../../hooks/use_kibana';
import type { EnhancedFailureStoreStats } from '../hooks/use_data_stream_stats';
import type { useFailureStoreConfig } from '../hooks/use_failure_store_config';
import { formatBytes } from '../helpers/format_bytes';
import { useIlmPhasesColorAndDescription } from '../hooks/use_ilm_phases_color_and_description';
import { DataLifecycleSummary } from '../common/data_lifecycle/data_lifecycle_summary';
import {
  buildLifecyclePhases,
  type LifecyclePhase,
} from '../common/data_lifecycle/lifecycle_types';

interface FailureStoreSummaryProps {
  stats?: EnhancedFailureStoreStats;
  failureStoreConfig: ReturnType<typeof useFailureStoreConfig>;
}

export const FailureStoreSummary = ({ stats, failureStoreConfig }: FailureStoreSummaryProps) => {
  const { isServerless } = useKibana();
  const { euiTheme } = useEuiTheme();
  const { ilmPhases } = useIlmPhasesColorAndDescription();

  const storageSize = stats?.size ? formatBytes(stats.size) : undefined;

  const retentionPeriod = failureStoreConfig.retentionDisabled
    ? undefined
    : failureStoreConfig.customRetentionPeriod ?? failureStoreConfig.defaultRetentionPeriod;

  const phases: LifecyclePhase[] = buildLifecyclePhases({
    label: isServerless
      ? i18n.translate('xpack.streams.streamDetailLifecycle.failedIngest', {
          defaultMessage: 'Failed ingest',
        })
      : i18n.translate('xpack.streams.streamDetailLifecycle.hot', {
          defaultMessage: 'Hot',
        }),
    color: isServerless ? euiTheme.colors.severity.danger : ilmPhases.hot.color,
    description: isServerless ? '' : ilmPhases.hot.description,
    size: storageSize,
    retentionPeriod,
    sizeInBytes: stats?.size,
    docsCount: stats?.count,
    deletePhaseDescription: ilmPhases.delete.description,
    deletePhaseColor: ilmPhases.delete.color,
  });

  return (
    <DataLifecycleSummary
      phases={phases}
      testSubjPrefix="failureStore"
      canManageLifecycle={false}
    />
  );
};
