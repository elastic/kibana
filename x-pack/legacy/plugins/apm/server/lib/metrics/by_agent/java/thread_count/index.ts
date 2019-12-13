/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import {
  METRIC_JAVA_THREAD_COUNT,
  SERVICE_AGENT_NAME
} from '../../../../../../common/elasticsearch_fieldnames';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters
} from '../../../../helpers/setup_request';
import { ChartBase } from '../../../types';
import { fetchAndTransformMetrics } from '../../../fetch_and_transform_metrics';

const series = {
  threadCount: {
    title: i18n.translate('xpack.apm.agentMetrics.java.threadCount', {
      defaultMessage: 'Avg. count'
    }),
    color: theme.euiColorVis0
  },
  threadCountMax: {
    title: i18n.translate('xpack.apm.agentMetrics.java.threadCountMax', {
      defaultMessage: 'Max count'
    }),
    color: theme.euiColorVis1
  }
};

const chartBase: ChartBase = {
  title: i18n.translate('xpack.apm.agentMetrics.java.threadCountChartTitle', {
    defaultMessage: 'Thread Count'
  }),
  key: 'thread_count_line_chart',
  type: 'linemark',
  yUnit: 'number',
  series
};

export async function getThreadCountChart(
  setup: Setup & SetupTimeRange & SetupUIFilters,
  serviceName: string,
  serviceNodeName?: string
) {
  return fetchAndTransformMetrics({
    setup,
    serviceName,
    serviceNodeName,
    chartBase,
    aggs: {
      threadCount: { avg: { field: METRIC_JAVA_THREAD_COUNT } },
      threadCountMax: { max: { field: METRIC_JAVA_THREAD_COUNT } }
    },
    additionalFilters: [{ term: { [SERVICE_AGENT_NAME]: 'java' } }]
  });
}
