/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSearchBarProps, Query } from '@elastic/eui';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSearchBar, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import type { OnboardingResult, TaskResult } from '@kbn/streams-schema';
import { TaskStatus } from '@kbn/streams-schema';
import pMap from 'p-map';
import React, { useCallback, useEffect, useState } from 'react';
import { useAIFeatures } from '../../../../hooks/use_ai_features';
import { useInsightsApi } from '../../../../hooks/use_insights_api';
import { StreamsAppSearchBar } from '../../../streams_app_search_bar';
import { useDiscoveryStreams } from '../../hooks/use_discovery_streams_fetch';
import { useOnboardingStatusUpdateQueue } from '../../hooks/use_onboarding_status_update_queue';
import {
  RUN_BULK_STREAM_ONBOARDING_BUTTON_LABEL,
  STREAMS_TABLE_SEARCH_ARIA_LABEL,
} from './translations';
import { StreamsTreeTable } from './tree_table';

const datePickerStyle = css`
  .euiFormControlLayout,
  .euiSuperDatePicker button,
  .euiButton {
    height: 40px;
  }
`;

interface StreamsViewProps {
  refreshUnbackedQueriesCount: () => void;
}

export function StreamsView({ refreshUnbackedQueriesCount }: StreamsViewProps) {
  const [searchQuery, setSearchQuery] = useState<Query | undefined>();
  const streamsListFetch = useDiscoveryStreams();
  const [selectedStreams, setSelectedStreams] = useState<ListStreamDetail[]>([]);
  const [streamOnboardingResultMap, setStreamOnboardingResultMap] = useState<
    Record<string, TaskResult<OnboardingResult>>
  >({});
  const aiFeatures = useAIFeatures();
  const { scheduleOnboardingTask, cancelOnboardingTask } = useInsightsApi(
    aiFeatures?.genAiConnectors.selectedConnector
  );
  const onStreamStatusUpdate = useCallback(
    (streamName: string, taskResult: TaskResult<OnboardingResult>) => {
      setStreamOnboardingResultMap((currentMap) => ({
        ...currentMap,
        [streamName]: taskResult,
      }));

      if (taskResult.status === TaskStatus.Completed) {
        refreshUnbackedQueriesCount();
      }
    },
    [refreshUnbackedQueriesCount]
  );
  const { onboardingStatusUpdateQueue, processStatusUpdateQueue } =
    useOnboardingStatusUpdateQueue(onStreamStatusUpdate);

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

  const bulkScheduleOnboardingTask = async (streamList: string[]) => {
    await pMap(
      streamList,
      async (streamName) => {
        await scheduleOnboardingTask(streamName);
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

    setSelectedStreams([]);

    await bulkScheduleOnboardingTask(streamList);
    streamList.forEach((streamName) => {
      onboardingStatusUpdateQueue.add(streamName);
    });
    processStatusUpdateQueue();
  };

  const onOnboardStreamActionClick = async (streamName: string) => {
    await bulkScheduleOnboardingTask([streamName]);

    onboardingStatusUpdateQueue.add(streamName);
    processStatusUpdateQueue();
  };

  const onStopOnboardingActionClick = (streamName: string) => {
    cancelOnboardingTask(streamName);
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
          selection={{ selected: selectedStreams, onSelectionChange: setSelectedStreams }}
          onOnboardStreamActionClick={onOnboardStreamActionClick}
          onStopOnboardingActionClick={onStopOnboardingActionClick}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
