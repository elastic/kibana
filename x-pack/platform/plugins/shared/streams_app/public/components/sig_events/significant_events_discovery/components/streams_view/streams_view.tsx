/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSearchBarProps, Query } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiSearchBar, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { OnboardingResult, TaskResult } from '@kbn/streams-schema';
import { OnboardingStep, TaskStatus } from '@kbn/streams-schema';
import pMap from 'p-map';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { TableRow } from './utils';
import type { UseConnectorConfigResult } from '../../../../../hooks/sig_events/use_connector_config';
import { useIndexPatternsConfig } from '../../../../../hooks/use_index_patterns_config';
import { useKibana } from '../../../../../hooks/use_kibana';
import type { ScheduleOnboardingOptions } from '../../../../../hooks/use_onboarding_api';
import { useOnboardingApi } from '../../../../../hooks/use_onboarding_api';
import { getFormattedError } from '../../../../../util/errors';
import { StreamsAppSearchBar } from '../../../../streams_app_search_bar';
import { useOnboardingStatusUpdateQueue } from '../../hooks/use_onboarding_status_update_queue';
import { GenerateSplitButton } from './generate_split_button';
import {
  ONBOARDING_FAILURE_TITLE,
  ONBOARDING_SCHEDULING_FAILURE_TITLE,
  STREAMS_TABLE_SEARCH_ARIA_LABEL,
} from './translations';
import { StreamsTreeTable } from './tree_table';
import { useFetchStreams } from '../../hooks/use_fetch_streams';

const datePickerStyle = css`
  .euiFormControlLayout,
  .euiSuperDatePicker button,
  .euiButton {
    height: 40px;
  }
`;

interface StreamsViewProps {
  refreshUnbackedQueriesCount: () => void;
  connectorConfig: UseConnectorConfigResult;
}

export function StreamsView({ refreshUnbackedQueriesCount, connectorConfig }: StreamsViewProps) {
  const {
    core: {
      notifications: { toasts },
    },
  } = useKibana();
  const isInitialStatusUpdateDone = useRef(false);
  const [searchQuery, setSearchQuery] = useState<Query | undefined>();
  const { filterStreamsByIndexPatterns } = useIndexPatternsConfig();

  const {
    featuresConnectors,
    queriesConnectors,
    allConnectors,
    connectorError,
    isConnectorCatalogUnavailable,
    onboardingConfig,
    setOnboardingConfig,
  } = connectorConfig;

  const streamsListFetch = useFetchStreams({
    select: (result) => {
      return {
        ...result,
        /**
         * Significant events discovery works with streams that match the configured index patterns.
         */
        streams: filterStreamsByIndexPatterns(result.streams),
      };
    },
  });

  const [selectedStreams, setSelectedStreams] = useState<TableRow[]>([]);
  const [streamOnboardingResultMap, setStreamOnboardingResultMap] = useState<
    Record<string, TaskResult<OnboardingResult>>
  >({});
  const { scheduleOnboardingTask, cancelOnboardingTask } = useOnboardingApi();

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
    if (streamsListFetch.data === undefined) {
      return;
    }

    streamsListFetch.data.streams.forEach((item) => {
      onboardingStatusUpdateQueue.add(item.stream.name);
    });
    processStatusUpdateQueue().finally(() => {
      isInitialStatusUpdateDone.current = true;
    });
  }, [onboardingStatusUpdateQueue, processStatusUpdateQueue, streamsListFetch.data]);

  const isStreamActionable = useCallback(
    (streamName: string) => {
      const result = streamOnboardingResultMap[streamName];
      if (!result) return false;
      return ![TaskStatus.InProgress, TaskStatus.BeingCanceled].includes(result.status);
    },
    [streamOnboardingResultMap]
  );

  const getActionableStreamNames = useCallback(
    () =>
      selectedStreams
        .filter((item) => isStreamActionable(item.stream.name))
        .map((item) => item.stream.name),
    [selectedStreams, isStreamActionable]
  );

  const bulkScheduleOnboardingTask = useCallback(
    async (streamList: string[], options?: ScheduleOnboardingOptions) => {
      try {
        await pMap(
          streamList,
          async (streamName) => {
            await scheduleOnboardingTask(streamName, options);
          },
          { concurrency: 10 }
        );
      } catch (error) {
        toasts.addError(getFormattedError(error), { title: ONBOARDING_SCHEDULING_FAILURE_TITLE });
      }

      streamList.forEach((streamName) => {
        onboardingStatusUpdateQueue.add(streamName);
      });
      processStatusUpdateQueue();
    },
    [scheduleOnboardingTask, toasts, onboardingStatusUpdateQueue, processStatusUpdateQueue]
  );

  const onBulkOnboardStreamsClick = useCallback(async () => {
    const streamList = getActionableStreamNames();
    setSelectedStreams([]);
    await bulkScheduleOnboardingTask(streamList, onboardingConfig);
  }, [getActionableStreamNames, bulkScheduleOnboardingTask, onboardingConfig]);

  const onBulkOnboardStep = useCallback(
    async (step: OnboardingStep) => {
      const streamList = getActionableStreamNames();
      setSelectedStreams([]);
      await bulkScheduleOnboardingTask(streamList, {
        steps: [step],
        connectors: onboardingConfig.connectors,
      });
    },
    [getActionableStreamNames, bulkScheduleOnboardingTask, onboardingConfig.connectors]
  );

  const onBulkOnboardFeaturesOnly = useCallback(
    () => onBulkOnboardStep(OnboardingStep.FeaturesIdentification),
    [onBulkOnboardStep]
  );

  const onBulkOnboardQueriesOnly = useCallback(
    () => onBulkOnboardStep(OnboardingStep.QueriesGeneration),
    [onBulkOnboardStep]
  );

  const onOnboardStreamActionClick = async (streamName: string) => {
    await bulkScheduleOnboardingTask([streamName]);
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
          <EuiFlexItem grow={false}>
            <GenerateSplitButton
              config={onboardingConfig}
              allConnectors={allConnectors}
              connectorError={connectorError}
              featuresResolvedConnectorId={featuresConnectors.resolvedConnectorId}
              queriesResolvedConnectorId={queriesConnectors.resolvedConnectorId}
              onConfigChange={setOnboardingConfig}
              onRun={onBulkOnboardStreamsClick}
              onRunFeaturesOnly={onBulkOnboardFeaturesOnly}
              onRunQueriesOnly={onBulkOnboardQueriesOnly}
              isRunDisabled={
                selectedStreams.length === 0 ||
                isConnectorCatalogUnavailable ||
                featuresConnectors.loading ||
                queriesConnectors.loading
              }
              isConfigDisabled={selectedStreams.length === 0}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiText size="s">
          {i18n.translate(
            'xpack.streams.significantEventsDiscovery.streamsTree.streamsCountLabel',
            {
              defaultMessage: '{count} streams',
              values: { count: streamsListFetch.data?.streams.length ?? 0 },
            }
          )}
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem>
        <StreamsTreeTable
          streams={streamsListFetch.data?.streams}
          streamOnboardingResultMap={streamOnboardingResultMap}
          loading={streamsListFetch.isLoading}
          searchQuery={searchQuery}
          selection={{
            selected: selectedStreams,
            onSelectionChange: setSelectedStreams,
            selectable: (row) => isStreamActionable(row.stream.name),
          }}
          onOnboardStreamActionClick={onOnboardStreamActionClick}
          onStopOnboardingActionClick={onStopOnboardingActionClick}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
