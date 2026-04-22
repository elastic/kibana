/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSearchBarProps, Query } from '@elastic/eui';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSearchBar, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { STREAMS_SIG_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID, TaskStatus } from '@kbn/streams-schema';
import React, { useCallback, useEffect, useState } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import type { TableRow } from './utils';
import { useInferenceFeatureConnectors } from '../../../../../hooks/sig_events/use_inference_feature_connectors';
import { useAIFeatures } from '../../../../../hooks/use_ai_features';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useInsightsDiscoveryApi } from '../../../../../hooks/sig_events/use_insights_discovery_api';
import { useStreamsAppRouter } from '../../../../../hooks/use_streams_app_router';
import { useTaskPolling } from '../../../../../hooks/use_task_polling';
import { getFormattedError } from '../../../../../util/errors';
import { StreamsAppSearchBar } from '../../../../streams_app_search_bar';
import { useKiGeneration } from '../knowledge_indicators_table/ki_generation_context';
import { GenerateSplitButton } from '../shared/generate_split_button';
import { InsightsSplitButton } from './insights_split_button';
import {
  getInsightsCompleteToastTitle,
  INSIGHTS_COMPLETE_TOAST_VIEW_BUTTON,
  INSIGHTS_SCHEDULING_FAILURE_TITLE,
  NO_INSIGHTS_TOAST_TITLE,
  STREAMS_TABLE_SEARCH_ARIA_LABEL,
} from './translations';
import { StreamsTreeTable } from './tree_table';

const IN_PROGRESS_STATUSES = new Set<TaskStatus>([TaskStatus.InProgress, TaskStatus.BeingCanceled]);

const datePickerStyle = css`
  .euiFormControlLayout,
  .euiSuperDatePicker button,
  .euiButton {
    height: 40px;
  }
`;

export function StreamsView() {
  const {
    core,
    core: {
      notifications: { toasts },
    },
  } = useKibana();
  const [searchQuery, setSearchQuery] = useState<Query | undefined>();
  const [isWaitingForInsightsTask, setIsWaitingForInsightsTask] = useState(false);

  const {
    filteredStreams,
    isStreamsLoading,
    isScheduling,
    onboardingConfig,
    setOnboardingConfig,
    featuresConnectors,
    queriesConnectors,
    generatingStreamNames,
    streamStatusMap,
    cancelOnboardingTask,
    bulkScheduleOnboardingTask,
    bulkOnboardAll,
    bulkOnboardFeaturesOnly,
    bulkOnboardQueriesOnly,
  } = useKiGeneration();

  const discoveryConnectors = useInferenceFeatureConnectors(
    STREAMS_SIG_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID
  );
  const aiFeatures = useAIFeatures();
  const allConnectors = aiFeatures?.genAiConnectors?.connectors ?? [];
  const connectorError = aiFeatures?.genAiConnectors?.error;
  const isConnectorCatalogUnavailable =
    !allConnectors.length || !!aiFeatures?.genAiConnectors?.loading || !!connectorError;

  const [discoveryConnectorOverride, setDiscoveryConnectorOverride] = useState<
    string | undefined
  >();
  const displayDiscoveryConnectorId =
    discoveryConnectorOverride ?? discoveryConnectors.resolvedConnectorId;

  const isStreamActionable = useCallback(
    (streamName: string) => {
      if (generatingStreamNames.includes(streamName)) return false;
      const result = streamStatusMap[streamName];
      return !!result && !IN_PROGRESS_STATUSES.has(result.status);
    },
    [generatingStreamNames, streamStatusMap]
  );

  const [selectedStreams, setSelectedStreams] = useState<TableRow[]>([]);
  const router = useStreamsAppRouter();
  const { scheduleInsightsDiscoveryTask, getInsightsDiscoveryTaskStatus } =
    useInsightsDiscoveryApi();
  const [{ value: insightsTask }, getInsightsTaskStatus] = useAsyncFn(
    getInsightsDiscoveryTaskStatus
  );
  useTaskPolling({
    task: insightsTask,
    onPoll: getInsightsDiscoveryTaskStatus,
    onRefresh: getInsightsTaskStatus,
  });

  const [{ loading: isSchedulingInsights }, scheduleInsightsTask] = useAsyncFn(async () => {
    const streamNames =
      selectedStreams.length > 0 ? selectedStreams.map((row) => row.stream.name) : undefined;
    try {
      await scheduleInsightsDiscoveryTask(streamNames, discoveryConnectorOverride);
      setIsWaitingForInsightsTask(true);
      await getInsightsTaskStatus();
    } catch (error) {
      toasts.addError(getFormattedError(error), {
        title: INSIGHTS_SCHEDULING_FAILURE_TITLE,
      });
      throw error;
    }
  }, [
    scheduleInsightsDiscoveryTask,
    selectedStreams,
    discoveryConnectorOverride,
    toasts,
    getInsightsTaskStatus,
  ]);

  useEffect(() => {
    if (!isWaitingForInsightsTask || !insightsTask) return;
    if (insightsTask.status !== TaskStatus.Completed && insightsTask.status !== TaskStatus.Failed) {
      return;
    }
    setIsWaitingForInsightsTask(false);
    if (insightsTask.status === TaskStatus.Failed) {
      toasts.addError(getFormattedError(new Error(insightsTask.error)), {
        title: INSIGHTS_SCHEDULING_FAILURE_TITLE,
      });
      return;
    }
    if (insightsTask.status === TaskStatus.Completed) {
      const count = insightsTask.insights?.length ?? 0;
      if (count === 0) {
        toasts.addInfo({
          title: NO_INSIGHTS_TOAST_TITLE,
        });
      } else {
        const toast = toasts.addSuccess({
          title: getInsightsCompleteToastTitle(count),
          text: toMountPoint(
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  data-test-subj="significant_events_view_insights_toast_button"
                  onClick={() => {
                    toasts.remove(toast);
                    router.push('/_discovery/{tab}', {
                      path: { tab: 'significant_events' },
                      query: {},
                    });
                  }}
                >
                  {INSIGHTS_COMPLETE_TOAST_VIEW_BUTTON}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>,
            core
          ),
        });
      }
    }
  }, [isWaitingForInsightsTask, insightsTask, toasts, router, core]);

  const handleQueryChange: EuiSearchBarProps['onChange'] = ({ query }) => {
    if (query) setSearchQuery(query);
  };

  const getActionableStreamNames = useCallback(
    () =>
      selectedStreams
        .filter((item) => isStreamActionable(item.stream.name))
        .map((item) => item.stream.name),
    [selectedStreams, isStreamActionable]
  );

  const onBulkOnboardStreamsClick = useCallback(async () => {
    const streamList = getActionableStreamNames();
    setSelectedStreams([]);
    await bulkOnboardAll(streamList);
  }, [getActionableStreamNames, bulkOnboardAll]);

  const onBulkOnboardFeaturesOnly = useCallback(async () => {
    const streamList = getActionableStreamNames();
    setSelectedStreams([]);
    await bulkOnboardFeaturesOnly(streamList);
  }, [getActionableStreamNames, bulkOnboardFeaturesOnly]);

  const onBulkOnboardQueriesOnly = useCallback(async () => {
    const streamList = getActionableStreamNames();
    setSelectedStreams([]);
    await bulkOnboardQueriesOnly(streamList);
  }, [getActionableStreamNames, bulkOnboardQueriesOnly]);

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
                queriesConnectors.loading ||
                isScheduling
              }
              isConfigDisabled={selectedStreams.length === 0}
              isLoading={isScheduling}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <InsightsSplitButton
              allConnectors={allConnectors}
              connectorError={connectorError}
              resolvedConnectorId={discoveryConnectors.resolvedConnectorId}
              displayConnectorId={displayDiscoveryConnectorId}
              onConnectorChange={setDiscoveryConnectorOverride}
              onRun={scheduleInsightsTask}
              isLoading={isSchedulingInsights || isWaitingForInsightsTask}
              isDisabled={isConnectorCatalogUnavailable || discoveryConnectors.loading}
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
              values: { count: filteredStreams?.length ?? 0 },
            }
          )}
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem>
        <StreamsTreeTable
          streams={filteredStreams}
          streamOnboardingResultMap={streamStatusMap}
          loading={isStreamsLoading}
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
