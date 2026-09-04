/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { BehaviorSubject } from 'rxjs';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { ANOMALY_SWIMLANE_EMBEDDABLE_TYPE } from '@kbn/ml-common-types/embeddables/anomaly_swimlane';
import { ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE } from '@kbn/ml-common-types/embeddables/anomaly_charts';
import { ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE } from '@kbn/ml-common-types/embeddables/single_metric_viewer';
import type { AnomalySwimLaneEmbeddableState } from '@kbn/ml-server-schemas/embeddables/anomaly_swimlane';
import type { AnomalyChartsEmbeddableState } from '@kbn/ml-server-schemas/embeddables/anomaly_charts';
import type { SingleMetricViewerEmbeddableState } from '@kbn/ml-server-schemas/embeddables/single_metric_viewer';
import type { Filter, Query, TimeRange } from '@kbn/es-query';

// The embeddable hover-actions button ("Menu for...") is absolutely positioned at top:0.
// The agent builder's inner panel has overflow:hidden + no padding, which clips it.
// Adding top padding here creates the room it needs.
const embeddableWrapperCss = css`
  padding-top: 32px;
`;

type MlChartAttachment<TData extends object> = UnknownAttachment & { data: TData };

const buildParentApi = (state: object, timeRange?: TimeRange) => ({
  getSerializedStateForChild: () => state,
  query$: new BehaviorSubject<Query | undefined>(undefined),
  filters$: new BehaviorSubject<Filter[] | undefined>([]),
  timeRange$: new BehaviorSubject<TimeRange | undefined>(timeRange),
  executionContext: {
    type: 'agent_builder' as const,
    description: 'ML anomaly chart',
    id: 'agent-ml-chart',
  },
});

export const InlineSwimLane = ({
  attachment,
  screenContext,
}: AttachmentRenderProps<MlChartAttachment<AnomalySwimLaneEmbeddableState>>) => {
  const { data } = attachment;
  const timeRange = data.time_range ?? screenContext?.time_range;
  const parentApi = useMemo(() => buildParentApi(data, timeRange), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div css={embeddableWrapperCss}>
      <EmbeddableRenderer<AnomalySwimLaneEmbeddableState>
        type={ANOMALY_SWIMLANE_EMBEDDABLE_TYPE}
        getParentApi={() => parentApi}
        panelProps={{ hideHeader: true }}
      />
    </div>
  );
};

export const InlineAnomalyCharts = ({
  attachment,
  screenContext,
}: AttachmentRenderProps<MlChartAttachment<AnomalyChartsEmbeddableState>>) => {
  const { data } = attachment;
  const timeRange = data.time_range ?? screenContext?.time_range;
  const parentApi = useMemo(() => buildParentApi(data, timeRange), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div css={embeddableWrapperCss}>
      <EmbeddableRenderer<AnomalyChartsEmbeddableState>
        type={ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE}
        getParentApi={() => parentApi}
        panelProps={{ hideHeader: true }}
      />
    </div>
  );
};

export const InlineSingleMetricViewer = ({
  attachment,
  screenContext,
}: AttachmentRenderProps<MlChartAttachment<SingleMetricViewerEmbeddableState>>) => {
  const { data } = attachment;
  const timeRange = data.time_range ?? screenContext?.time_range;
  const parentApi = useMemo(() => buildParentApi(data, timeRange), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div css={embeddableWrapperCss}>
      <EmbeddableRenderer<SingleMetricViewerEmbeddableState>
        type={ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE}
        getParentApi={() => parentApi}
        panelProps={{ hideHeader: true }}
      />
    </div>
  );
};
