/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSearchBarProps, Query } from '@elastic/eui';
import {
  EuiButton,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSearchBar,
  EuiSplitButton,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { MANAGEMENT_APP_LOCATOR } from '@kbn/deeplinks-management/constants';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { OnboardingResult, TaskResult } from '@kbn/streams-schema';
import {
  OnboardingStep,
  STREAMS_SIG_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID,
  STREAMS_SIG_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID,
  STREAMS_SIG_EVENTS_KI_QUERY_GENERATION_INFERENCE_FEATURE_ID,
  TaskStatus,
} from '@kbn/streams-schema';
import pMap from 'p-map';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import type { TableRow } from './utils';
import { useIndexPatternsConfig } from '../../../../../hooks/use_index_patterns_config';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useInsightsDiscoveryApi } from '../../../../../hooks/sig_events/use_insights_discovery_api';
import { useInferenceFeatureConnectors } from '../../../../../hooks/sig_events/use_inference_feature_connectors';
import type { ScheduleOnboardingOptions } from '../../../../../hooks/use_onboarding_api';
import { useOnboardingApi } from '../../../../../hooks/use_onboarding_api';
import { useStreamsAppRouter } from '../../../../../hooks/use_streams_app_router';
import { useTaskPolling } from '../../../../../hooks/use_task_polling';
import { getFormattedError } from '../../../../../util/errors';
import { StreamsAppSearchBar } from '../../../../streams_app_search_bar';
import { useBoolean } from '@kbn/react-hooks';
import { useOnboardingStatusUpdateQueue } from '../../hooks/use_onboarding_status_update_queue';
import { ConnectorIcon } from '../../../../connector_list_button/connector_icon';
import type { OnboardingConfig } from './onboarding_config_popover';
import { ConnectorSubPanel, OnboardingConfigPopover } from './onboarding_config_popover';
import {
  DISCOVER_INSIGHTS_BUTTON_LABEL,
  DISCOVER_INSIGHTS_CONFIG_ARIA_LABEL,
  getInsightsCompleteToastTitle,
  INSIGHTS_COMPLETE_TOAST_VIEW_BUTTON,
  INSIGHTS_SCHEDULING_FAILURE_TITLE,
  MODEL_SELECTION_PANEL_TITLE,
  MODEL_SETTINGS_LABEL,
  NO_INSIGHTS_TOAST_TITLE,
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
}

export function StreamsView({ refreshUnbackedQueriesCount }: StreamsViewProps) {
  const {
    core,
    core: {
      notifications: { toasts },
    },
    dependencies: {
      start: { share },
    },
  } = useKibana();
  const isInitialStatusUpdateDone = useRef(false);
  const [searchQuery, setSearchQuery] = useState<Query | undefined>();
  const [isWaitingForInsightsTask, setIsWaitingForInsightsTask] = useState(false);
  const { filterStreamsByIndexPatterns } = useIndexPatternsConfig();

  const featuresConnectors = useInferenceFeatureConnectors(
    STREAMS_SIG_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID
  );
  const queriesConnectors = useInferenceFeatureConnectors(
    STREAMS_SIG_EVENTS_KI_QUERY_GENERATION_INFERENCE_FEATURE_ID
  );
  const discoveryConnectors = useInferenceFeatureConnectors(
    STREAMS_SIG_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID
  );

  const [discoveryConnectorOverride, setDiscoveryConnectorOverride] = useState<
    string | undefined
  >();
  const displayDiscoveryConnectorId =
    discoveryConnectorOverride ?? discoveryConnectors.resolvedConnector?.connectorId;

  const [onboardingConfig, setOnboardingConfig] = useState<OnboardingConfig>({
    steps: [OnboardingStep.FeaturesIdentification, OnboardingStep.QueriesGeneration],
    connectors: {},
  });

  useEffect(() => {
    setOnboardingConfig((prev) => ({
      ...prev,
      connectors: {
        ...prev.connectors,
        ...(featuresConnectors.resolvedConnector && !prev.connectors.features
          ? { features: featuresConnectors.resolvedConnector.connectorId }
          : {}),
        ...(queriesConnectors.resolvedConnector && !prev.connectors.queries
          ? { queries: queriesConnectors.resolvedConnector.connectorId }
          : {}),
      },
    }));
  }, [featuresConnectors.resolvedConnector, queriesConnectors.resolvedConnector]);

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
  const router = useStreamsAppRouter();
  const { scheduleOnboardingTask, cancelOnboardingTask } = useOnboardingApi();
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
  }, [scheduleInsightsDiscoveryTask, selectedStreams, discoveryConnectorOverride, toasts, getInsightsTaskStatus]);

  // When we started the insights task from this view and it completes, show toast
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

  const getActionableStreamNames = () =>
    selectedStreams
      .filter((item) => {
        const status = streamOnboardingResultMap[item.stream.name]?.status;
        return ![TaskStatus.InProgress, TaskStatus.BeingCanceled].includes(status);
      })
      .map((item) => item.stream.name);

  const bulkScheduleOnboardingTask = async (
    streamList: string[],
    options?: ScheduleOnboardingOptions
  ) => {
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
  };

  const onBulkOnboardStreamsClick = async () => {
    const streamList = getActionableStreamNames();
    setSelectedStreams([]);
    await bulkScheduleOnboardingTask(streamList, onboardingConfig);
  };

  const onBulkOnboardFeaturesOnly = async () => {
    const streamList = getActionableStreamNames();
    setSelectedStreams([]);
    await bulkScheduleOnboardingTask(streamList, {
      steps: [OnboardingStep.FeaturesIdentification],
      connectors: onboardingConfig.connectors,
    });
  };

  const onBulkOnboardQueriesOnly = async () => {
    const streamList = getActionableStreamNames();
    setSelectedStreams([]);
    await bulkScheduleOnboardingTask(streamList, {
      steps: [OnboardingStep.QueriesGeneration],
      connectors: onboardingConfig.connectors,
    });
  };

  const onOnboardStreamActionClick = async (streamName: string) => {
    await bulkScheduleOnboardingTask([streamName]);
  };

  const onStopOnboardingActionClick = (streamName: string) => {
    cancelOnboardingTask(streamName);
  };

  const [isInsightsMenuOpen, { off: closeInsightsMenu, toggle: toggleInsightsMenu }] =
    useBoolean(false);
  const [insightsMenuResetKey, setInsightsMenuResetKey] = useState(0);
  const insightsPopoverId = useGeneratedHtmlId({ prefix: 'insightsConfigPopover' });

  const resetInsightsMenu = useCallback(() => setInsightsMenuResetKey((k) => k + 1), []);
  const handleCloseInsightsMenu = useCallback(() => {
    closeInsightsMenu();
    resetInsightsMenu();
  }, [closeInsightsMenu, resetInsightsMenu]);

  const handleDiscoveryConnectorSelect = useCallback(
    (connectorId: string) => {
      setDiscoveryConnectorOverride(connectorId);
      resetInsightsMenu();
    },
    [resetInsightsMenu]
  );

  const discoveryConnector = discoveryConnectors.allConnectors.find(
    (c) => c.connectorId === displayDiscoveryConnectorId
  );

  const insightsManagementUrl = useMemo(() => {
    const managementLocator = share.url.locators.get(MANAGEMENT_APP_LOCATOR);
    return (
      managementLocator?.getRedirectUrl({
        sectionId: 'modelManagement',
        appId: 'model_settings',
      }) ?? ''
    );
  }, [share.url.locators]);

  const insightsContextMenuPanels = useMemo(
    () => [
      {
        id: 0,
        items: [
          {
            name: (
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <ConnectorIcon connectorName={discoveryConnector?.name} />
                </EuiFlexItem>
                <EuiFlexItem css={{ minWidth: 0 }}>
                  <div className="eui-textTruncate">
                    Model <strong>{discoveryConnector?.name ?? '—'}</strong>
                  </div>
                </EuiFlexItem>
              </EuiFlexGroup>
            ),
            panel: 1,
          },
          ...(insightsManagementUrl
            ? [
                { isSeparator: true as const },
                {
                  name: (
                    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                      <EuiFlexItem>{MODEL_SETTINGS_LABEL}</EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiIcon type="popout" size="s" color="subdued" />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  ),
                  icon: 'gear' as const,
                  onClick: () => {
                    window.open(insightsManagementUrl, '_blank', 'noreferrer');
                    handleCloseInsightsMenu();
                  },
                },
              ]
            : []),
        ],
      },
      {
        id: 1,
        title: MODEL_SELECTION_PANEL_TITLE,
        width: 240,
        content: (
          <ConnectorSubPanel
            connectors={discoveryConnectors.allConnectors}
            resolvedConnector={discoveryConnectors.resolvedConnector}
            selectedConnectorId={displayDiscoveryConnectorId}
            onSelect={handleDiscoveryConnectorSelect}
          />
        ),
      },
    ],
    [
      discoveryConnector,
      discoveryConnectors,
      displayDiscoveryConnectorId,
      insightsManagementUrl,
      handleCloseInsightsMenu,
      handleDiscoveryConnectorSelect,
    ]
  );

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
            <OnboardingConfigPopover
              config={onboardingConfig}
              featuresConnectors={featuresConnectors}
              queriesConnectors={queriesConnectors}
              onConfigChange={setOnboardingConfig}
              onRun={onBulkOnboardStreamsClick}
              onRunFeaturesOnly={onBulkOnboardFeaturesOnly}
              onRunQueriesOnly={onBulkOnboardQueriesOnly}
              isRunDisabled={selectedStreams.length === 0}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSplitButton
              size="m"
              color="text"
              isLoading={isSchedulingInsights || isWaitingForInsightsTask}
              isDisabled={!aiFeatures?.genAiConnectors?.connectors?.length}
              data-test-subj="significant_events_discover_insights_split_button"
            >
              <EuiSplitButton.ActionPrimary
                onClick={() => scheduleInsightsTask()}
                data-test-subj="significant_events_discover_insights_button"
              >
                {DISCOVER_INSIGHTS_BUTTON_LABEL}
              </EuiSplitButton.ActionPrimary>
              <EuiSplitButton.ActionSecondary
                iconType="arrowDown"
                aria-label={DISCOVER_INSIGHTS_CONFIG_ARIA_LABEL}
                data-test-subj="significant_events_insights_connector_trigger"
                onClick={toggleInsightsMenu}
                popoverProps={{
                  id: insightsPopoverId,
                  isOpen: isInsightsMenuOpen,
                  closePopover: handleCloseInsightsMenu,
                  anchorPosition: 'downRight',
                  panelPaddingSize: 'none',
                  children: (
                    <EuiContextMenu
                      key={insightsMenuResetKey}
                      initialPanelId={0}
                      panels={insightsContextMenuPanels}
                    />
                  ),
                }}
              />
            </EuiSplitButton>
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
            selectable: (row) => {
              const status = streamOnboardingResultMap[row.stream.name]?.status;
              return (
                status === undefined ||
                ![TaskStatus.InProgress, TaskStatus.BeingCanceled].includes(status)
              );
            },
          }}
          onOnboardStreamActionClick={onOnboardStreamActionClick}
          onStopOnboardingActionClick={onStopOnboardingActionClick}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
