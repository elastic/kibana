/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import type { AnomalySwimLaneEmbeddableState } from '@kbn/ml-server-schemas/embeddables/anomaly_swimlane';
import type { AnomalyChartsEmbeddableState } from '@kbn/ml-server-schemas/embeddables/anomaly_charts';
import type { SingleMetricViewerEmbeddableState } from '@kbn/ml-server-schemas/embeddables/single_metric_viewer';
import {
  ANOMALY_SWIMLANE_ATTACHMENT_TYPE,
  ANOMALY_CHARTS_ATTACHMENT_TYPE,
  SINGLE_METRIC_VIEWER_ATTACHMENT_TYPE,
} from '../../common/agent_builder/attachment_type_ids';

type SwimLaneAttachment = UnknownAttachment & { data: AnomalySwimLaneEmbeddableState };
type AnomalyChartsAttachment = UnknownAttachment & { data: AnomalyChartsEmbeddableState };
type SingleMetricViewerAttachment = UnknownAttachment & { data: SingleMetricViewerEmbeddableState };

const LazyInlineSwimLane = React.lazy(() =>
  import('./inline_ml_charts').then((m) => ({ default: m.InlineSwimLane }))
);

const LazyInlineAnomalyCharts = React.lazy(() =>
  import('./inline_ml_charts').then((m) => ({ default: m.InlineAnomalyCharts }))
);

const LazyInlineSingleMetricViewer = React.lazy(() =>
  import('./inline_ml_charts').then((m) => ({ default: m.InlineSingleMetricViewer }))
);

const getLabel = (attachment: UnknownAttachment, fallback: string): string => {
  const title = (attachment.data as Record<string, unknown>)?.title;
  return typeof title === 'string' && title.length > 0 ? title : fallback;
};

export function registerAgentBuilderAttachments(agentBuilder: AgentBuilderPluginStart) {
  agentBuilder.attachments.addAttachmentType<SwimLaneAttachment>(
    ANOMALY_SWIMLANE_ATTACHMENT_TYPE,
    {
      getLabel: (attachment) => getLabel(attachment, 'Anomaly Swim Lane'),
      getIcon: () => 'machineLearningApp',
      renderInlineContent: (props) => (
        <React.Suspense fallback={null}>
          <LazyInlineSwimLane {...props} />
        </React.Suspense>
      ),
    }
  );

  agentBuilder.attachments.addAttachmentType<AnomalyChartsAttachment>(
    ANOMALY_CHARTS_ATTACHMENT_TYPE,
    {
      getLabel: (attachment) => getLabel(attachment, 'Anomaly Charts'),
      getIcon: () => 'machineLearningApp',
      renderInlineContent: (props) => (
        <React.Suspense fallback={null}>
          <LazyInlineAnomalyCharts {...props} />
        </React.Suspense>
      ),
    }
  );

  agentBuilder.attachments.addAttachmentType<SingleMetricViewerAttachment>(
    SINGLE_METRIC_VIEWER_ATTACHMENT_TYPE,
    {
      getLabel: (attachment) => getLabel(attachment, 'Single Metric Viewer'),
      getIcon: () => 'machineLearningApp',
      renderInlineContent: (props) => (
        <React.Suspense fallback={null}>
          <LazyInlineSingleMetricViewer {...props} />
        </React.Suspense>
      ),
    }
  );
}
