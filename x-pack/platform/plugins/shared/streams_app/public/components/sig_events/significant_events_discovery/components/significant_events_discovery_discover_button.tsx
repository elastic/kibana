/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { TaskStatus } from '@kbn/streams-schema';
import type { UseConnectorConfigResult } from '../../../../hooks/sig_events/use_connector_config';
import { useInsightsDiscoveryApi } from '../../../../hooks/sig_events/use_insights_discovery_api';
import { useKibana } from '../../../../hooks/use_kibana';
import { useStreamsAppRouter } from '../../../../hooks/use_streams_app_router';
import { useTaskPolling } from '../../../../hooks/use_task_polling';
import { getFormattedError } from '../../../../util/errors';
import { InsightsSplitButton } from './streams_view/insights_split_button';
import {
  getInsightsCompleteToastTitle,
  INSIGHTS_COMPLETE_TOAST_VIEW_BUTTON,
  INSIGHTS_SCHEDULING_FAILURE_TITLE,
  NO_INSIGHTS_TOAST_TITLE,
} from './streams_view/translations';

export function SignificantEventsDiscoveryDiscoverButton({
  connectorConfig,
}: {
  connectorConfig: UseConnectorConfigResult;
}) {
  const {
    core,
    core: {
      notifications: { toasts },
    },
  } = useKibana();
  const router = useStreamsAppRouter();
  const [isWaitingForInsightsTask, setIsWaitingForInsightsTask] = useState(false);

  const {
    allConnectors,
    connectorError,
    isConnectorCatalogUnavailable,
    discoveryConnectors,
    discoveryConnectorOverride,
    setDiscoveryConnectorOverride,
    displayDiscoveryConnectorId,
  } = connectorConfig;

  const { scheduleInsightsDiscoveryTask, getInsightsDiscoveryTaskStatus } =
    useInsightsDiscoveryApi();
  const [{ value: insightsTask }, getInsightsTaskStatus] = useAsyncFn(
    getInsightsDiscoveryTaskStatus
  );

  useEffect(() => {
    getInsightsTaskStatus();
  }, [getInsightsTaskStatus]);

  useTaskPolling({
    task: insightsTask,
    onPoll: getInsightsDiscoveryTaskStatus,
    onRefresh: getInsightsTaskStatus,
  });

  const [{ loading: isSchedulingInsights }, scheduleInsightsTask] = useAsyncFn(async () => {
    const streamNames = undefined;
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

  return (
    <InsightsSplitButton
      allConnectors={allConnectors}
      connectorError={connectorError}
      resolvedConnectorId={discoveryConnectors.resolvedConnectorId}
      displayConnectorId={displayDiscoveryConnectorId}
      onConnectorChange={setDiscoveryConnectorOverride}
      onRun={scheduleInsightsTask}
      isLoading={
        isSchedulingInsights ||
        isWaitingForInsightsTask ||
        insightsTask?.status === TaskStatus.InProgress
      }
      isDisabled={isConnectorCatalogUnavailable || discoveryConnectors.loading}
    />
  );
}
