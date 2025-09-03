/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { niceTimeFormatter } from '@elastic/charts';
import { EuiFlexGroup, EuiPanel, EuiText } from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import type { StreamQueryKql, Streams } from '@kbn/streams-schema';
import React, { useMemo } from 'react';
import { useTimefilter } from '../../../../hooks/use_timefilter';
import { SparkPlot } from '../../../spark_plot';
import { useSignificantEventPreviewFetch } from '../manual_flow_form/use_significant_event_preview_fetch';
import { useSparkplotDataFromSigEvents } from '../manual_flow_form/use_spark_plot_data_from_sig_events';

export function PreviewDataSparkPlot({
  query,
  definition,
  timeRange,
  isQueryValid,
}: {
  definition: Streams.all.Definition;
  query: StreamQueryKql;
  timeRange: TimeRange;
  isQueryValid: boolean;
}) {
  const {
    timeState: { start, end },
  } = useTimefilter();

  const previewFetch = useSignificantEventPreviewFetch({
    name: definition.name,
    kqlQuery: query.kql.query,
    timeRange,
    isQueryValid,
  });

  const xFormatter = useMemo(() => {
    return niceTimeFormatter([start, end]);
  }, [start, end]);

  const sparkPlotData = useSparkplotDataFromSigEvents({
    previewFetch,
    queryValues: query,
    xFormatter,
  });

  return (
    <EuiPanel hasBorder={true}>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiText size="xs">
          <h4>
            {i18n.translate(
              'xpack.streams.addSignificantEventFlyout.manualFlow.previewChartTitle',
              { defaultMessage: 'Occurrences' }
            )}
          </h4>
        </EuiText>
        <SparkPlot
          id="query_preview"
          name={i18n.translate(
            'xpack.streams.addSignificantEventFlyout.manualFlow.previewChartSeriesName',
            { defaultMessage: 'Count' }
          )}
          type="bar"
          timeseries={sparkPlotData.timeseries}
          annotations={sparkPlotData.annotations}
          xFormatter={xFormatter}
          compressed={false}
        />
      </EuiFlexGroup>
    </EuiPanel>
  );
}
