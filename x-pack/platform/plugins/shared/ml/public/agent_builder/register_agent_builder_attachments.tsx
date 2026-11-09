/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSkeletonText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import type { AnomalySwimLaneEmbeddableState } from '@kbn/ml-server-schemas/embeddables/anomaly_swimlane';
import type { AnomalyChartsEmbeddableState } from '@kbn/ml-server-schemas/embeddables/anomaly_charts';
import type { SingleMetricViewerEmbeddableState } from '@kbn/ml-server-schemas/embeddables/single_metric_viewer';
import type {
  DataFrameAnalysisConfigType,
  TotalFeatureImportance,
} from '@kbn/ml-data-frame-analytics-utils';
import {
  ANOMALY_SWIMLANE_ATTACHMENT_TYPE,
  ANOMALY_CHARTS_ATTACHMENT_TYPE,
  SINGLE_METRIC_VIEWER_ATTACHMENT_TYPE,
  DFA_SCATTERPLOT_MATRIX_ATTACHMENT_TYPE,
  DFA_TOTAL_FEATURE_IMPORTANCE_ATTACHMENT_TYPE,
} from '../../common/agent_builder/attachment_type_ids';
import type { InlineMlChartServices } from './inline_ml_charts';
import type { InlineTotalFeatureImportanceServices } from './inline_total_feature_importance';
import type {
  InlineScatterplotMatrixData,
  InlineScatterplotMatrixServices,
} from './inline_scatterplot_matrix';

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

const LazyInlineTotalFeatureImportance = React.lazy(() =>
  import('./inline_total_feature_importance').then((m) => ({
    default: m.InlineTotalFeatureImportance,
  }))
);

const LazyInlineScatterplotMatrix = React.lazy(() =>
  import('./inline_scatterplot_matrix').then((m) => ({
    default: m.InlineScatterplotMatrix,
  }))
);

type DfaTotalFeatureImportanceAttachment = UnknownAttachment & {
  data: {
    job_id: string;
    analysis_type?: DataFrameAnalysisConfigType;
    total_feature_importance: TotalFeatureImportance[];
  };
};

type DfaScatterplotMatrixAttachment = UnknownAttachment & {
  data: InlineScatterplotMatrixData;
};

export type InlineDfaAttachmentServices = InlineTotalFeatureImportanceServices &
  InlineScatterplotMatrixServices;

const getLabel = (attachment: UnknownAttachment, fallback: string): string => {
  const title = (attachment.data as Record<string, unknown>)?.title;
  return typeof title === 'string' && title.length > 0 ? title : fallback;
};

export function registerAgentBuilderAttachments(
  agentBuilder: AgentBuilderPluginStart,
  services: InlineMlChartServices
) {
  agentBuilder.attachments.addAttachmentType<SwimLaneAttachment>(ANOMALY_SWIMLANE_ATTACHMENT_TYPE, {
    getLabel: (attachment) =>
      getLabel(
        attachment,
        i18n.translate('xpack.ml.agentBuilder.attachments.anomalySwimLane.label', {
          defaultMessage: 'Anomaly swim lane',
        })
      ),
    getIcon: () => 'machineLearningApp',
    renderInlineContent: (props, callbacks) => (
      <React.Suspense fallback={<EuiSkeletonText lines={3} />}>
        <LazyInlineSwimLane
          {...props}
          services={services}
          registerActionButtons={callbacks?.registerActionButtons}
        />
      </React.Suspense>
    ),
  });

  agentBuilder.attachments.addAttachmentType<AnomalyChartsAttachment>(
    ANOMALY_CHARTS_ATTACHMENT_TYPE,
    {
      getLabel: (attachment) =>
        getLabel(
          attachment,
          i18n.translate('xpack.ml.agentBuilder.attachments.anomalyCharts.label', {
            defaultMessage: 'Anomaly charts',
          })
        ),
      getIcon: () => 'machineLearningApp',
      renderInlineContent: (props, callbacks) => (
        <React.Suspense fallback={<EuiSkeletonText lines={3} />}>
          <LazyInlineAnomalyCharts
            {...props}
            services={services}
            registerActionButtons={callbacks?.registerActionButtons}
          />
        </React.Suspense>
      ),
    }
  );

  agentBuilder.attachments.addAttachmentType<SingleMetricViewerAttachment>(
    SINGLE_METRIC_VIEWER_ATTACHMENT_TYPE,
    {
      getLabel: (attachment) =>
        getLabel(
          attachment,
          i18n.translate('xpack.ml.agentBuilder.attachments.singleMetricViewer.label', {
            defaultMessage: 'Single Metric Viewer',
          })
        ),
      getIcon: () => 'machineLearningApp',
      renderInlineContent: (props, callbacks) => (
        <React.Suspense fallback={<EuiSkeletonText lines={3} />}>
          <LazyInlineSingleMetricViewer
            {...props}
            services={services}
            registerActionButtons={callbacks?.registerActionButtons}
          />
        </React.Suspense>
      ),
    }
  );
}

/** Registers data frame analytics result charts for agent chat. */
export function registerDfaAgentBuilderAttachments(
  agentBuilder: AgentBuilderPluginStart,
  services: InlineDfaAttachmentServices
) {
  agentBuilder.attachments.addAttachmentType<DfaTotalFeatureImportanceAttachment>(
    DFA_TOTAL_FEATURE_IMPORTANCE_ATTACHMENT_TYPE,
    {
      getLabel: (attachment) =>
        getLabel(
          attachment,
          i18n.translate('xpack.ml.agentBuilder.attachments.totalFeatureImportance.label', {
            defaultMessage: 'Total feature importance',
          })
        ),
      getIcon: () => 'machineLearningApp',
      renderInlineContent: (props, callbacks) => (
        <React.Suspense fallback={<EuiSkeletonText lines={3} />}>
          <LazyInlineTotalFeatureImportance
            jobId={props.attachment.data.job_id}
            analysisType={props.attachment.data.analysis_type}
            totalFeatureImportance={props.attachment.data.total_feature_importance}
            services={services}
            registerActionButtons={callbacks?.registerActionButtons}
          />
        </React.Suspense>
      ),
    }
  );

  agentBuilder.attachments.addAttachmentType<DfaScatterplotMatrixAttachment>(
    DFA_SCATTERPLOT_MATRIX_ATTACHMENT_TYPE,
    {
      getLabel: (attachment) =>
        getLabel(
          attachment,
          i18n.translate('xpack.ml.agentBuilder.attachments.scatterplotMatrix.label', {
            defaultMessage: 'Scatterplot matrix',
          })
        ),
      getIcon: () => 'machineLearningApp',
      renderInlineContent: (props, callbacks) => (
        <React.Suspense fallback={<EuiSkeletonText lines={3} />}>
          <LazyInlineScatterplotMatrix
            attachmentData={props.attachment.data}
            services={services}
            registerActionButtons={callbacks?.registerActionButtons}
          />
        </React.Suspense>
      ),
    }
  );
}
