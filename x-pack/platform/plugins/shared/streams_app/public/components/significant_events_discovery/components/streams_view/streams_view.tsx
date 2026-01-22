/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { niceTimeFormatter } from '@elastic/charts';
import type { EuiSearchBarProps, Query } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSearchBar,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import { TaskStatus } from '@kbn/streams-schema';
import type { InsightsOnboardingResult } from '@kbn/streams-schema/src/insights';
import type { TaskResult } from '@kbn/streams-schema/src/tasks/types';
import { compact } from 'lodash';
import pMap from 'p-map';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAIFeatures } from '../../../../hooks/use_ai_features';
import { useFetchSignificantEvents } from '../../../../hooks/use_fetch_significant_events';
import { useInsightsApi } from '../../../../hooks/use_insights_api';
import { useTimefilter } from '../../../../hooks/use_timefilter';
import { StreamsAppSearchBar } from '../../../streams_app_search_bar';
import { formatChangePoint } from '../../utils/change_point';
import { SignificantEventsHistogramChart } from '../significant_events_histogram_chart/significant_events_histogram_chart';
import {
  OCCURRENCES_CHART_TITLE,
  RUN_BULK_STREAM_ONBOARDING_BUTTON_LABEL,
  STREAMS_TABLE_SEARCH_ARIA_LABEL,
} from './translations';
import { StreamsTreeTable } from './tree_table';
import { useDiscoveryStreams } from './use_discovery_streams_fetch';
import { useOnboardingStatusUpdateQueue } from './use_onboarding_status_update_queue';

const datePickerStyle = css`
  .euiFormControlLayout,
  .euiSuperDatePicker button,
  .euiButton {
    height: 40px;
  }
`;

export function StreamsView() {
  const [searchQuery, setSearchQuery] = useState<Query | undefined>();
  const { timeState } = useTimefilter();
  const streamsListFetch = useDiscoveryStreams();
  const [selectedStreams, setSelectedStreams] = useState<ListStreamDetail[]>([]);
  const significantEventsFetchState = useFetchSignificantEvents();
  const [streamOnboardingResultMap, setStreamOnboardingResultMap] = useState<
    Record<string, TaskResult<InsightsOnboardingResult>>
  >({});
  const aiFeatures = useAIFeatures();
  const { scheduleInsightsOnboardingTask, cancelInsightsOnboardingTask } = useInsightsApi(
    aiFeatures?.genAiConnectors.selectedConnector
  );
  const onStreamStatusUpdate = useCallback(
    (streamName: string, taskResult: TaskResult<InsightsOnboardingResult>) => {
      setStreamOnboardingResultMap((currentMap) => ({
        ...currentMap,
        [streamName]: taskResult,
      }));
    },
    []
  );
  const { onboardingStatusUpdateQueue, processStatusUpdateQueue } =
    useOnboardingStatusUpdateQueue(onStreamStatusUpdate);

  const xFormatter = useMemo(() => {
    return niceTimeFormatter([timeState.start, timeState.end]);
  }, [timeState.start, timeState.end]);

  const handleQueryChange: EuiSearchBarProps['onChange'] = ({ query }) => {
    if (query) setSearchQuery(query);
  };

  useEffect(() => {
    if (streamsListFetch.value === undefined) {
      return;
    }

    streamsListFetch.value.streams.forEach((item) => {
      onboardingStatusUpdateQueue.add(item.stream.name);
    });
    processStatusUpdateQueue();
  }, [onboardingStatusUpdateQueue, processStatusUpdateQueue, streamsListFetch.value]);

  const bulkScheduleInsightsOnboardingTask = async (streamList: string[]) => {
    await pMap(
      streamList,
      async (streamName) => {
        await scheduleInsightsOnboardingTask(streamName);
      },
      { concurrency: 10 }
    );
  };

  const onBulkOnboardStreamsClick = async () => {
    const streamList = selectedStreams
      .filter((item) => {
        const onboardingResult = streamOnboardingResultMap[item.stream.name];

        return ![TaskStatus.InProgress, TaskStatus.BeingCanceled].includes(onboardingResult.status);
      })
      .map((item) => item.stream.name);

    await bulkScheduleInsightsOnboardingTask(streamList);
    streamList.forEach((streamName) => {
      onboardingStatusUpdateQueue.add(streamName);
    });
    processStatusUpdateQueue();
  };

  const onOnboardStreamActionClick = async (streamName: string) => {
    await bulkScheduleInsightsOnboardingTask([streamName]);

    onboardingStatusUpdateQueue.add(streamName);
    processStatusUpdateQueue();
  };

  const onStopOnboardingActionClick = (streamName: string) => {
    cancelInsightsOnboardingTask(streamName);
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem>
            <EuiSearchBar
              query={searchQuery}
              onChange={handleQueryChange}
              box={{
                incremental: true,
                'aria-label': STREAMS_TABLE_SEARCH_ARIA_LABEL,
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false} css={datePickerStyle}>
            <StreamsAppSearchBar showDatePicker />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiPanel hasShadow={false} hasBorder={false} color="subdued">
          <EuiPanel hasBorder={true} color="plain">
            <EuiText>
              <h3>{OCCURRENCES_CHART_TITLE}</h3>
            </EuiText>
            <EuiSpacer size="m" />
            <SignificantEventsHistogramChart
              id={'all-events'}
              occurrences={significantEventsFetchState.data?.aggregated_occurrences ?? []}
              changes={compact(
                (significantEventsFetchState.data?.significant_events ?? []).map((item) =>
                  formatChangePoint({
                    query: item.query,
                    change_points: item.change_points,
                    occurrences: item.occurrences,
                  })
                )
              )}
              xFormatter={xFormatter}
              compressed={false}
              height={180}
            />
          </EuiPanel>
        </EuiPanel>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiText size="s">
            {i18n.translate(
              'xpack.streams.significantEventsDiscovery.streamsTree.streamsCountLabel',
              {
                defaultMessage: '{count} streams',
                values: { count: streamsListFetch.value?.streams.length ?? 0 },
              }
            )}
          </EuiText>

          <EuiButtonEmpty
            onClick={onBulkOnboardStreamsClick}
            iconType="securitySignal"
            disabled={selectedStreams.length === 0}
          >
            {RUN_BULK_STREAM_ONBOARDING_BUTTON_LABEL}
          </EuiButtonEmpty>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem>
        <StreamsTreeTable
          streams={streamsListFetch.value?.streams}
          streamOnboardingResultMap={streamOnboardingResultMap}
          loading={streamsListFetch.loading}
          searchQuery={searchQuery}
          onSelectionChange={setSelectedStreams}
          onOnboardStreamActionClick={onOnboardStreamActionClick}
          onStopOnboardingActionClick={onStopOnboardingActionClick}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
