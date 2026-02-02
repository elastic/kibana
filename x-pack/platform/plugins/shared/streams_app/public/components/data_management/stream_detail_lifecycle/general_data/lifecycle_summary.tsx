/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Streams } from '@kbn/streams-schema';
import { isDslLifecycle, isIlmLifecycle } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { useEuiTheme } from '@elastic/eui';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
import { useKibana } from '../../../../hooks/use_kibana';
import { useIlmPhasesColorAndDescription } from '../hooks/use_ilm_phases_color_and_description';
import type { DataStreamStats } from '../hooks/use_data_stream_stats';
import { formatBytes } from '../helpers/format_bytes';
import { getILMRatios } from '../helpers/helpers';
import {
  DataLifecycleSummary,
  buildLifecyclePhases,
  type LifecyclePhase,
} from '../common/data_lifecycle/data_lifecycle_summary';

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
      return phasesWithGrow.map((phase, index) => ({
        color: ilmPhases[phase.name].color,
        label: phase.name,
        size: 'size_in_bytes' in phase ? formatBytes(phase.size_in_bytes) : undefined,
        grow: phase.grow,
        isDelete: phase.name === 'delete',
        timelineValue: phasesWithGrow[index + 1]?.min_age,
      }));
    }

    if (isDsl) {
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
      });
    }

    return [];
  };

  return <DataLifecycleSummary phases={getPhases()} loading={isIlm && ilmLoading} />;
};
