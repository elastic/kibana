/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Streams } from '@kbn/streams-schema';
import { isDisabledLifecycle, isDslLifecycle, isIlmLifecycle } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { useEuiTheme } from '@elastic/eui';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
import { useKibana } from '../../../../hooks/use_kibana';
import { useIlmPhasesColorAndDescription } from '../hooks/use_ilm_phases_color_and_description';
import type { DataStreamStats } from '../hooks/use_data_stream_stats';
import { formatBytes } from '../helpers/format_bytes';
import { getILMRatios } from '../helpers/helpers';
import { DataLifecycleSummary } from '../common/data_lifecycle/data_lifecycle_summary';
import {
  buildLifecyclePhases,
  type LifecyclePhase,
} from '../common/data_lifecycle/lifecycle_types';

interface LifecycleSummaryProps {
  definition: Streams.ingest.all.GetResponse;
  stats?: DataStreamStats;
}

export const LifecycleSummary = ({ definition, stats }: LifecycleSummaryProps) => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
    isServerless,
  } = useKibana();
  const { euiTheme } = useEuiTheme();
  const { ilmPhases } = useIlmPhasesColorAndDescription();

  const isIlm = isIlmLifecycle(definition.effective_lifecycle);
  const isDsl = isDslLifecycle(definition.effective_lifecycle);
  const isRetentionDisabled = isDisabledLifecycle(definition.effective_lifecycle);

  const { value: ilmStatsValue, loading: ilmLoading } = useStreamsAppFetch(
    ({ signal }) => {
      if (!isIlm) {
        return undefined;
      }
      return streamsRepositoryClient.fetch('GET /internal/streams/{name}/lifecycle/_stats', {
        params: { path: { name: definition.stream.name } },
        signal,
      });
    },
    [streamsRepositoryClient, definition, isIlm]
  );

  const getPhases = (): LifecyclePhase[] => {
    if (isIlm) {
      const phasesWithGrow = getILMRatios(ilmStatsValue);
      if (!phasesWithGrow) {
        return [];
      }

      // Calculate total docs and distribute based on size ratio
      const totalDocs = stats?.totalDocs || 0;
      const totalSize = phasesWithGrow.reduce(
        (sum, phase) => sum + ('size_in_bytes' in phase ? phase.size_in_bytes : 0),
        0
      );

      return phasesWithGrow.map((phase, index) => {
        // Estimate doc count based on size ratio
        const phaseSize = 'size_in_bytes' in phase ? phase.size_in_bytes : 0;
        const estimatedDocs =
          totalSize > 0 && totalDocs > 0
            ? Math.round((phaseSize / totalSize) * totalDocs)
            : undefined;

        // Get readonly and searchable_snapshot from the server-side phase data
        const hasReadonlyAction = 'readonly' in phase && phase.readonly === true;
        const searchableSnapshotAction =
          'searchable_snapshot' in phase ? phase.searchable_snapshot : undefined;

        return {
          name: phase.name,
          color: ilmPhases[phase.name].color,
          label: phase.name,
          size: 'size_in_bytes' in phase ? formatBytes(phase.size_in_bytes) : undefined,
          grow: phase.grow,
          isDelete: phase.name === 'delete',
          timelineValue: phasesWithGrow[index + 1]?.min_age,
          description: ilmPhases[phase.name].description,
          sizeInBytes: 'size_in_bytes' in phase ? phase.size_in_bytes : undefined,
          docsCount: estimatedDocs,
          min_age: phase.min_age,
          isReadOnly: hasReadonlyAction,
          downsample: 'downsample' in phase ? phase.downsample : undefined,
          searchableSnapshot: searchableSnapshotAction,
        };
      });
    }

    if (isDsl || isRetentionDisabled) {
      const lifecycle = definition.effective_lifecycle;
      const retentionPeriod = isDslLifecycle(lifecycle) ? lifecycle.dsl.data_retention : undefined;
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
    }

    return [];
  };

  const getDslDownsampleSteps = () => {
    if (isDslLifecycle(definition.effective_lifecycle)) {
      return definition.effective_lifecycle.dsl.downsample;
    }
    // Ilm downsampling is defined by the phases so returning undefined
    return undefined;
  };

  return (
    <DataLifecycleSummary
      phases={getPhases()}
      loading={isIlm && ilmLoading}
      downsampleSteps={getDslDownsampleSteps()}
    />
  );
};
