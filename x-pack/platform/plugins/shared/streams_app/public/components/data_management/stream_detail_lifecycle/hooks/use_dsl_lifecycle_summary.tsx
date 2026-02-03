/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import {
  isDisabledLifecycle,
  isDslLifecycle,
  type IngestStreamLifecycleDSL,
} from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { useEuiTheme } from '@elastic/eui';
import { useKibana } from '../../../../hooks/use_kibana';
import { useIlmPhasesColorAndDescription } from './use_ilm_phases_color_and_description';
import type { DataStreamStats } from './use_data_stream_stats';
import { formatBytes } from '../helpers/format_bytes';
import type { LifecyclePhase } from '../common/data_lifecycle/lifecycle_types';
import { buildLifecyclePhases } from '../common/data_lifecycle/lifecycle_types';

interface UseDslLifecycleSummaryProps {
  definition: Streams.ingest.all.GetResponse;
  stats?: DataStreamStats;
}

interface UseDslLifecycleSummaryResult {
  phases: LifecyclePhase[];
  downsampleSteps?: IngestStreamLifecycleDSL['dsl']['downsample'];
}

export const useDslLifecycleSummary = ({
  definition,
  stats,
}: UseDslLifecycleSummaryProps): UseDslLifecycleSummaryResult => {
  const { isServerless } = useKibana();

  const { euiTheme } = useEuiTheme();
  const { ilmPhases } = useIlmPhasesColorAndDescription();

  const effectiveLifecycle = definition.effective_lifecycle;
  const isDsl = isDslLifecycle(effectiveLifecycle);
  const isRetentionDisabled = isDisabledLifecycle(effectiveLifecycle);

  const getPhases = (): LifecyclePhase[] => {
    if (!isDsl && !isRetentionDisabled) {
      return [];
    }

    const retentionPeriod = isDsl ? effectiveLifecycle.dsl.data_retention : undefined;
    const storageSize = stats?.sizeBytes ? formatBytes(stats.sizeBytes) : undefined;

    return buildLifecyclePhases({
      label: isServerless
        ? i18n.translate('xpack.streams.streamDetailLifecycle.successfulIngest', {
            defaultMessage: 'Successful ingest',
          })
        : i18n.translate('xpack.streams.streamDetailLifecycle.hot', {
            defaultMessage: 'Hot',
          }),
      color: isServerless ? euiTheme.colors.severity.success : ilmPhases.hot.color,
      size: storageSize,
      retentionPeriod,
      description: isServerless ? '' : ilmPhases.hot.description,
      sizeInBytes: stats?.sizeBytes,
      docsCount: stats?.totalDocs,
      deletePhaseDescription: ilmPhases.delete.description,
      deletePhaseColor: ilmPhases.delete.color,
    });
  };

  const downsampleSteps = isDsl ? effectiveLifecycle.dsl.downsample : undefined;

  return {
    phases: getPhases(),
    downsampleSteps,
  };
};
