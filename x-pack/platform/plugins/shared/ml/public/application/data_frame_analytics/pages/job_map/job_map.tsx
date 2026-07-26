/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useEuiTheme, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { JOB_MAP_NODE_TYPES } from '@kbn/ml-data-frame-analytics-utils';
import { ML_PAGES } from '@kbn/ml-common-types/locator_ml_pages';
import { useMlKibana } from '../../../contexts/kibana';
import { JobMapNodeFlyout, JobMapLegend, JobMapReactFlow } from './components';
import { useRefresh } from '../../../routing/use_refresh';
import { useRefDimensions } from './components/use_ref_dimensions';
import {
  useFetchAnalyticsMapData,
  type GetDataObjectParameter,
} from './use_fetch_analytics_map_data';
import { useCreateAndNavigateToManagementMlLink } from '../../../contexts/kibana/use_create_url';
import type { JobMapNodeData } from './map_elements_to_flow';
import { isNodeElement } from './map_elements_to_flow';
import { JOB_MAP_CANVAS_BOTTOM_PADDING } from './job_map_flow_constants';

interface Props {
  defaultHeight?: number;
  analyticsId?: string;
  modelId?: string;
  forceRefresh?: boolean;
}

export const JobMap: FC<Props> = ({ defaultHeight, analyticsId, modelId, forceRefresh }) => {
  const [resetViewportSignal, setResetViewportSignal] = useState<number>(0);
  const [selectedNodeData, setSelectedNodeData] = useState<JobMapNodeData | undefined>();
  const {
    elements,
    error,
    fetchAndSetElementsWrapper,
    message,
    nodeDetails,
    setElements,
    setError,
  } = useFetchAnalyticsMapData();

  const {
    services: { notifications },
  } = useMlKibana();
  const { euiTheme } = useEuiTheme();
  const refresh = useRefresh();

  const redirectToAnalyticsManagementPage = useCreateAndNavigateToManagementMlLink(
    ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE,
    'analytics'
  );

  const onClearSelection = useCallback(() => {
    setSelectedNodeData(undefined);
  }, []);

  const updateElements = useCallback(
    (nodeId: string, nodeLabel: string, destIndexNode?: string) => {
      if (nodeLabel === analyticsId) {
        redirectToAnalyticsManagementPage();
      } else {
        const filteredElements = elements.filter((e) => {
          let isNotDeletedNodeOrRelated =
            e.data.id !== nodeId &&
            !('target' in e.data && e.data.target === nodeId) &&
            !('source' in e.data && e.data.source === nodeId);

          if (
            e.data.id !== undefined &&
            isNodeElement(e) &&
            e.data.type === JOB_MAP_NODE_TYPES.TRAINED_MODEL
          ) {
            isNotDeletedNodeOrRelated =
              isNotDeletedNodeOrRelated &&
              nodeDetails[e.data.id]?.metadata?.analytics_config?.id !== nodeLabel;
          }

          if (destIndexNode !== undefined) {
            return (
              isNotDeletedNodeOrRelated &&
              e.data.id !== destIndexNode &&
              !('target' in e.data && e.data.target === destIndexNode) &&
              !('source' in e.data && e.data.source === destIndexNode)
            );
          }

          return isNotDeletedNodeOrRelated;
        });
        setElements(filteredElements);
      }
    },
    [analyticsId, elements, nodeDetails, redirectToAnalyticsManagementPage, setElements]
  );

  // Keep a stable ref to the latest fetch function so effects that only want to
  // re-run on specific prop changes don't need to list `fetchAndSetElementsWrapper`
  // (which is recreated on every render) as a dependency.
  const fetchRef = useRef(fetchAndSetElementsWrapper);
  useEffect(() => {
    fetchRef.current = fetchAndSetElementsWrapper;
  });

  useEffect(() => {
    fetchRef.current({ analyticsId, modelId });
  }, [analyticsId, modelId]);

  useEffect(() => {
    setSelectedNodeData(undefined);
  }, [analyticsId, modelId]);

  useEffect(() => {
    if (forceRefresh === true) {
      fetchRef.current({ analyticsId, modelId });
    }
  }, [forceRefresh, analyticsId, modelId]);

  useEffect(() => {
    if (message !== undefined) {
      notifications.toasts.add(message);
    }
  }, [message, notifications.toasts]);

  useEffect(
    function updateOnTimerRefresh() {
      if (!refresh) return;
      fetchRef.current({ analyticsId, modelId });
    },
    [refresh, analyticsId, modelId]
  );

  useEffect(() => {
    if (selectedNodeData === undefined) {
      return;
    }
    const stillPresent = elements.some(
      (el) => isNodeElement(el) && el.data.id === selectedNodeData.id
    );
    if (!stillPresent) {
      setSelectedNodeData(undefined);
    }
  }, [elements, selectedNodeData]);

  useEffect(() => {
    if (error !== undefined) {
      notifications.toasts.addDanger(
        i18n.translate('xpack.ml.dataframe.analyticsMap.fetchDataErrorMessage', {
          defaultMessage: 'Unable to fetch some data. An error occurred: {error}',
          values: { error: JSON.stringify(error) },
        })
      );
      setError(undefined);
    }
  }, [error, notifications.toasts, setError]);

  const { ref, width, height } = useRefDimensions();

  const getNodeData = useCallback(
    (params?: GetDataObjectParameter) => fetchRef.current(params),
    // fetchRef is a stable ref — no dep needed.
    []
  );

  const refreshCallback = useCallback(
    () => fetchRef.current({ analyticsId, modelId }),
    [analyticsId, modelId]
  );

  const hasMissingJobNode = useMemo(
    () =>
      elements.some(
        (el) => isNodeElement(el) && el.data.type === JOB_MAP_NODE_TYPES.ANALYTICS_JOB_MISSING
      ),
    [elements]
  );

  const h = defaultHeight ?? height;
  return (
    <div data-test-subj="mlPageDataFrameAnalyticsMap">
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="row" gutterSize="none" justifyContent="spaceBetween">
        <EuiFlexItem>
          <JobMapLegend hasMissingJobNode={hasMissingJobNode} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            data-test-subj="mlAnalyticsResetGraphButton"
            onClick={() => setResetViewportSignal((n) => n + 1)}
          >
            <FormattedMessage
              id="xpack.ml.dataframe.analyticsList.resetMapButtonLabel"
              defaultMessage="Reset"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <div
        style={{ height: h - parseInt(euiTheme.size.l, 10) - JOB_MAP_CANVAS_BOTTOM_PADDING }}
        ref={ref}
      >
        <JobMapReactFlow
          elements={elements}
          height={h - JOB_MAP_CANVAS_BOTTOM_PADDING}
          width={width}
          resetViewportSignal={resetViewportSignal}
          selectedNodeId={selectedNodeData?.id}
          onSelectNodeData={setSelectedNodeData}
          onClearSelection={onClearSelection}
        />
        <JobMapNodeFlyout
          details={nodeDetails}
          getNodeData={getNodeData}
          modelId={modelId}
          selectedNodeData={selectedNodeData}
          onClearSelection={onClearSelection}
          updateElements={updateElements}
          refreshJobsCallback={refreshCallback}
        />
      </div>
    </div>
  );
};
