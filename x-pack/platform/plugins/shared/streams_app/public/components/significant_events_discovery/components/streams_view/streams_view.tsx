/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSearchBarProps, Query } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSearchBar,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { OnboardingResult, TaskResult } from '@kbn/streams-schema';
import { TaskStatus } from '@kbn/streams-schema';
import pMap from 'p-map';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAIFeatures } from '../../../../hooks/use_ai_features';
import { useInsightsDiscoveryApi } from '../../../../hooks/use_insights_discovery_api';
import { useKibana } from '../../../../hooks/use_kibana';
import { useOnboardingApi } from '../../../../hooks/use_onboarding_api';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
import { getFormattedError } from '../../../../util/errors';
import { StreamsAppSearchBar } from '../../../streams_app_search_bar';
import { useDiscoveryStreams } from '../../hooks/use_discovery_streams_fetch';
import { useOnboardingStatusUpdateQueue } from '../../hooks/use_onboarding_status_update_queue';
import {
  DISCOVER_INSIGHTS_BUTTON_LABEL,
  DISCOVER_INSIGHTS_DISABLED_NO_EVENTS_DESCRIPTION,
  DISCOVER_INSIGHTS_DISABLED_NO_EVENTS_TITLE,
  ONBOARDING_FAILURE_TITLE,
  ONBOARDING_SCHEDULING_FAILURE_TITLE,
  RUN_BULK_STREAM_ONBOARDING_BUTTON_LABEL,
  STREAMS_TABLE_SEARCH_ARIA_LABEL,
} from './translations';
import { StreamsTreeTable } from './tree_table';
import type { TableRow } from './utils';

const datePickerStyle = css`
  .euiFormControlLayout,
  .euiSuperDatePicker button,
  .euiButton {
    height: 40px;
  }
`;

interface StreamsViewProps {
  refreshUnbackedQueriesCount: () => void;
  isInsightsTaskRunning?: boolean;
  onInsightsTaskScheduled?: () => void;
}

export function StreamsView({
  refreshUnbackedQueriesCount,
  isInsightsTaskRunning = false,
  onInsightsTaskScheduled,
}: StreamsViewProps) {
  const {
    core: {
      notifications: { toasts },
    },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const [searchQuery, setSearchQuery] = useState<Query | undefined>();
  const [discoverInsightsPopoverOpen, setDiscoverInsightsPopoverOpen] = useState(false);
  const streamsListFetch = useDiscoveryStreams();
  const [selectedStreams, setSelectedStreams] = useState<TableRow[]>([]);
  const significantEventsFetch = useStreamsAppFetch(
    async ({ signal }) =>
      streamsRepositoryClient.fetch('GET /internal/streams/_significant_events', {
        params: {
          query: {
            from: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            to: new Date().toISOString(),
            bucketSize: '30s',
          },
        },
        signal,
      }),
    [streamsRepositoryClient]
  );

  const streamNameToEventCount = useMemo(() => {
    const value = significantEventsFetch.value;
    if (!value?.significant_events) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const event of value.significant_events) {
      const total = event.occurrences.reduce((acc, o) => acc + o.count, 0);
      map.set(event.stream_name, (map.get(event.stream_name) ?? 0) + total);
    }
    return map;
  }, [significantEventsFetch.value]);

  const hasSignificantEvents = useMemo(() => {
    const countByStream = streamNameToEventCount;
    const total =
      selectedStreams.length === 0
        ? [...countByStream.values()].reduce((acc, count) => acc + count, 0)
        : selectedStreams.reduce((acc, row) => acc + (countByStream.get(row.stream.name) ?? 0), 0);
    return total > 0;
  }, [streamNameToEventCount, selectedStreams]);
  const isInitialStatusUpdateDone = useRef(false);
  const [streamOnboardingResultMap, setStreamOnboardingResultMap] = useState<
    Record<string, TaskResult<OnboardingResult>>
  >({});
  const aiFeatures = useAIFeatures();
  const { scheduleOnboardingTask, cancelOnboardingTask } = useOnboardingApi(
    aiFeatures?.genAiConnectors.selectedConnector
  );
  const { scheduleInsightsDiscoveryTask } = useInsightsDiscoveryApi(
    aiFeatures?.genAiConnectors.selectedConnector
  );
  const onStreamStatusUpdate = useCallback(
    (streamName: string, taskResult: TaskResult<OnboardingResult>) => {
      setStreamOnboardingResultMap((currentMap) => ({
        ...currentMap,
        [streamName]: taskResult,
      }));

      /**
       * Preventing showing error toasts and doing extra work
       * for the initial status update when the page loads for
       * the first time
       */
      if (!isInitialStatusUpdateDone.current) {
        return;
      }

      if (taskResult.status === TaskStatus.Failed) {
        toasts.addError(getFormattedError(new Error(taskResult.error)), {
          title: ONBOARDING_FAILURE_TITLE,
        });
      }

      if (taskResult.status === TaskStatus.Completed) {
        refreshUnbackedQueriesCount();
      }
    },
    [refreshUnbackedQueriesCount, toasts]
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
    processStatusUpdateQueue().finally(() => {
      isInitialStatusUpdateDone.current = true;
    });
  }, [onboardingStatusUpdateQueue, processStatusUpdateQueue, streamsListFetch.value]);

  const bulkScheduleOnboardingTask = async (streamList: string[]) => {
    try {
      await pMap(
        streamList,
        async (streamName) => {
          await scheduleOnboardingTask(streamName);
        },
        { concurrency: 10 }
      );
    } catch (error) {
      toasts.addError(getFormattedError(error), {
        title: ONBOARDING_SCHEDULING_FAILURE_TITLE,
      });
    }
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

  const isDiscoverInsightsDisabled = !hasSignificantEvents || isInsightsTaskRunning;

  const onBulkDiscoverInsightsClick = async () => {
    if (isDiscoverInsightsDisabled) return;
    const streamNames =
      selectedStreams.length > 0 ? selectedStreams.map((row) => row.stream.name) : undefined;

    try {
      await scheduleInsightsDiscoveryTask(streamNames);
      setSelectedStreams([]);
      onInsightsTaskScheduled?.();
    } catch (error) {
      toasts.addError(getFormattedError(error), {
        title: i18n.translate(
          'xpack.streams.significantEventsDiscovery.streamsTree.insightsDiscoverySchedulingFailureTitle',
          {
            defaultMessage: 'Failed to schedule insights discovery',
          }
        ),
      });
    }
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

          {hasSignificantEvents ? (
            <EuiButtonEmpty
              iconType="crosshairs"
              disabled={isDiscoverInsightsDisabled}
              isLoading={isInsightsTaskRunning}
              onClick={onBulkDiscoverInsightsClick}
            >
              {DISCOVER_INSIGHTS_BUTTON_LABEL}
            </EuiButtonEmpty>
          ) : (
            <EuiPopover
              isOpen={discoverInsightsPopoverOpen}
              closePopover={() => setDiscoverInsightsPopoverOpen(false)}
              anchorPosition="downCenter"
              button={
                <span
                  css={{ display: 'inline-block', cursor: 'pointer' }}
                  onClick={() => setDiscoverInsightsPopoverOpen((open) => !open)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setDiscoverInsightsPopoverOpen((open) => !open);
                    }
                  }}
                  onMouseEnter={() => setDiscoverInsightsPopoverOpen(true)}
                  onMouseLeave={() => setDiscoverInsightsPopoverOpen(false)}
                  role="button"
                  tabIndex={0}
                  aria-label={DISCOVER_INSIGHTS_DISABLED_NO_EVENTS_TITLE}
                  aria-haspopup="dialog"
                  aria-expanded={discoverInsightsPopoverOpen}
                >
                  <EuiButtonEmpty iconType="crosshairs" disabled css={{ pointerEvents: 'none' }}>
                    {DISCOVER_INSIGHTS_BUTTON_LABEL}
                  </EuiButtonEmpty>
                </span>
              }
              panelProps={{
                onMouseEnter: () => setDiscoverInsightsPopoverOpen(true),
                onMouseLeave: () => setDiscoverInsightsPopoverOpen(false),
              }}
            >
              <EuiFlexGroup direction="column" gutterSize="s" css={{ maxWidth: 320 }}>
                <EuiFlexItem>
                  <EuiText size="s" css={{ fontWeight: 600 }}>
                    {DISCOVER_INSIGHTS_DISABLED_NO_EVENTS_TITLE}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s">{DISCOVER_INSIGHTS_DISABLED_NO_EVENTS_DESCRIPTION}</EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPopover>
          )}
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
