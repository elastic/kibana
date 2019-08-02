/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { InfraMetric } from '../../../graphql/types';
import { InfraFormatterType } from '../../../lib/lib';
import { nginxLayoutCreator } from './nginx';
import {
  InfraMetricLayoutCreator,
  InfraMetricLayoutSectionType,
  InfraMetricLayoutVisualizationType,
} from './types';

export const containerLayoutCreator: InfraMetricLayoutCreator = theme => [
  {
    id: 'containerOverview',
    label: i18n.translate('xpack.infra.metricDetailPage.containerMetricsLayout.layoutLabel', {
      defaultMessage: 'Container',
    }),
    sections: [
      {
        id: InfraMetric.containerOverview,
        label: i18n.translate(
          'xpack.infra.metricDetailPage.containerMetricsLayout.overviewSection.sectionLabel',
          {
            defaultMessage: 'Overview',
          }
        ),
        requires: ['docker.cpu', 'docker.memory', 'docker.network'],
        type: InfraMetricLayoutSectionType.gauges,
        visConfig: {
          seriesOverrides: {
            cpu: {
              name: i18n.translate(
                'xpack.infra.metricDetailPage.containerMetricsLayout.overviewSection.cpuUsageSeriesLabel',
                {
                  defaultMessage: 'CPU Usage',
                }
              ),
              color: theme.eui.euiColorFullShade,
              formatter: InfraFormatterType.percent,
              gaugeMax: 1,
            },
            memory: {
              name: i18n.translate(
                'xpack.infra.metricDetailPage.containerMetricsLayout.overviewSection.memoryUsageSeriesLabel',
                {
                  defaultMessage: 'Memory Usage',
                }
              ),
              color: theme.eui.euiColorFullShade,
              formatter: InfraFormatterType.percent,
              gaugeMax: 1,
            },
            rx: {
              name: i18n.translate(
                'xpack.infra.metricDetailPage.containerMetricsLayout.overviewSection.inboundRXSeriesLabel',
                {
                  defaultMessage: 'Inbound (RX)',
                }
              ),
              color: theme.eui.euiColorFullShade,
              formatter: InfraFormatterType.bits,
              formatterTemplate: '{{value}}/s',
            },
            tx: {
              name: i18n.translate(
                'xpack.infra.metricDetailPage.containerMetricsLayout.overviewSection.outboundTXSeriesLabel',
                {
                  defaultMessage: 'Outbound (TX)',
                }
              ),
              color: theme.eui.euiColorFullShade,
              formatter: InfraFormatterType.bits,
              formatterTemplate: '{{value}}/s',
            },
          },
        },
      },
      {
        id: InfraMetric.containerCpuUsage,
        label: i18n.translate(
          'xpack.infra.metricDetailPage.containerMetricsLayout.cpuUsageSection.sectionLabel',
          {
            defaultMessage: 'CPU Usage',
          }
        ),
        requires: ['docker.cpu'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          stacked: true,
          type: InfraMetricLayoutVisualizationType.area,
          formatter: InfraFormatterType.percent,
          seriesOverrides: {
            cpu: { color: theme.eui.euiColorVis1 },
          },
        },
      },
      {
        id: InfraMetric.containerMemory,
        label: i18n.translate(
          'xpack.infra.metricDetailPage.containerMetricsLayout.memoryUsageSection.sectionLabel',
          {
            defaultMessage: 'Memory Usage',
          }
        ),
        requires: ['docker.memory'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          stacked: true,
          type: InfraMetricLayoutVisualizationType.area,
          formatter: InfraFormatterType.percent,
          seriesOverrides: {
            memory: { color: theme.eui.euiColorVis1 },
          },
        },
      },
      {
        id: InfraMetric.containerNetworkTraffic,
        label: i18n.translate(
          'xpack.infra.metricDetailPage.containerMetricsLayout.networkTrafficSection.sectionLabel',
          {
            defaultMessage: 'Network Traffic',
          }
        ),
        requires: ['docker.network'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          formatter: InfraFormatterType.bits,
          formatterTemplate: '{{value}}/s',
          type: InfraMetricLayoutVisualizationType.area,
          seriesOverrides: {
            rx: {
              color: theme.eui.euiColorVis1,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.containerMetricsLayout.networkTrafficSection.networkRxRateSeriesLabel',
                {
                  defaultMessage: 'in',
                }
              ),
            },
            tx: {
              color: theme.eui.euiColorVis2,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.containerMetricsLayout.networkTrafficSection.networkTxRateSeriesLabel',
                {
                  defaultMessage: 'out',
                }
              ),
            },
          },
        },
      },
      {
        id: InfraMetric.containerDiskIOOps,
        label: i18n.translate(
          'xpack.infra.metricDetailPage.containerMetricsLayout.diskIoOpsSection.sectionLabel',
          {
            defaultMessage: 'Disk IO (Ops)',
          }
        ),
        requires: ['docker.diskio'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          formatter: InfraFormatterType.number,
          formatterTemplate: '{{value}}/s',
          type: InfraMetricLayoutVisualizationType.area,
          seriesOverrides: {
            read: {
              color: theme.eui.euiColorVis1,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.containerMetricsLayout.diskIoOpsSection.readRateSeriesLabel',
                {
                  defaultMessage: 'reads',
                }
              ),
            },
            write: {
              color: theme.eui.euiColorVis2,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.containerMetricsLayout.diskIoOpsSection.writeRateSeriesLabel',
                {
                  defaultMessage: 'writes',
                }
              ),
            },
          },
        },
      },
      {
        id: InfraMetric.containerDiskIOBytes,
        label: i18n.translate(
          'xpack.infra.metricDetailPage.containerMetricsLayout.diskIoBytesSection.sectionLabel',
          {
            defaultMessage: 'Disk IO (Bytes)',
          }
        ),
        requires: ['docker.diskio'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          formatter: InfraFormatterType.bytes,
          formatterTemplate: '{{value}}/s',
          type: InfraMetricLayoutVisualizationType.area,
          seriesOverrides: {
            read: {
              color: theme.eui.euiColorVis1,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.containerMetricsLayout.diskIoBytesSection.readRateSeriesLabel',
                {
                  defaultMessage: 'reads',
                }
              ),
            },
            write: {
              color: theme.eui.euiColorVis2,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.containerMetricsLayout.diskIoBytesSection.writeRateSeriesLabel',
                {
                  defaultMessage: 'writes',
                }
              ),
            },
          },
        },
      },
    ],
  },
  ...nginxLayoutCreator(theme),
];
