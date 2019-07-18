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

export const hostLayoutCreator: InfraMetricLayoutCreator = theme => [
  {
    id: 'hostOverview',
    label: i18n.translate('xpack.infra.metricDetailPage.hostMetricsLayout.layoutLabel', {
      defaultMessage: 'Host',
    }),
    sections: [
      {
        id: InfraMetric.hostSystemOverview,
        linkToId: 'hostOverview',
        label: i18n.translate(
          'xpack.infra.metricDetailPage.hostMetricsLayout.overviewSection.sectionLabel',
          {
            defaultMessage: 'Overview',
          }
        ),
        requires: ['system.cpu', 'system.load', 'system.memory', 'system.network'],
        type: InfraMetricLayoutSectionType.gauges,
        visConfig: {
          seriesOverrides: {
            cpu: {
              name: i18n.translate(
                'xpack.infra.metricDetailPage.hostMetricsLayout.overviewSection.cpuUsageSeriesLabel',
                {
                  defaultMessage: 'CPU Usage',
                }
              ),
              color: theme.eui.euiColorFullShade,
              formatter: InfraFormatterType.percent,
              gaugeMax: 1,
            },
            load: {
              name: i18n.translate(
                'xpack.infra.metricDetailPage.hostMetricsLayout.overviewSection.loadSeriesLabel',
                {
                  defaultMessage: 'Load (5m)',
                }
              ),
              color: theme.eui.euiColorFullShade,
            },
            memory: {
              name: i18n.translate(
                'xpack.infra.metricDetailPage.hostMetricsLayout.overviewSection.memoryCapacitySeriesLabel',
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
                'xpack.infra.metricDetailPage.hostMetricsLayout.overviewSection.inboundRXSeriesLabel',
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
                'xpack.infra.metricDetailPage.hostMetricsLayout.overviewSection.outboundTXSeriesLabel',
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
        id: InfraMetric.hostCpuUsage,
        label: i18n.translate(
          'xpack.infra.metricDetailPage.hostMetricsLayout.cpuUsageSection.sectionLabel',
          {
            defaultMessage: 'CPU Usage',
          }
        ),
        requires: ['system.cpu'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          stacked: true,
          type: InfraMetricLayoutVisualizationType.area,
          formatter: InfraFormatterType.percent,
          seriesOverrides: {
            user: { color: theme.eui.euiColorVis0 },
            system: { color: theme.eui.euiColorVis2 },
            steal: { color: theme.eui.euiColorVis9 },
            irq: { color: theme.eui.euiColorVis4 },
            softirq: { color: theme.eui.euiColorVis6 },
            iowait: { color: theme.eui.euiColorVis7 },
            nice: { color: theme.eui.euiColorVis5 },
          },
        },
      },
      {
        id: InfraMetric.hostLoad,
        label: i18n.translate(
          'xpack.infra.metricDetailPage.hostMetricsLayout.loadSection.sectionLabel',
          {
            defaultMessage: 'Load',
          }
        ),
        requires: ['system.load'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          seriesOverrides: {
            load_1m: {
              color: theme.eui.euiColorVis0,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.hostMetricsLayout.loadSection.oneMinuteSeriesLabel',
                {
                  defaultMessage: '1m',
                }
              ),
            },
            load_5m: {
              color: theme.eui.euiColorVis1,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.hostMetricsLayout.loadSection.fiveMinuteSeriesLabel',
                {
                  defaultMessage: '5m',
                }
              ),
            },
            load_15m: {
              color: theme.eui.euiColorVis3,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.hostMetricsLayout.loadSection.fifteenMinuteSeriesLabel',
                {
                  defaultMessage: '15m',
                }
              ),
            },
          },
        },
      },
      {
        id: InfraMetric.hostMemoryUsage,
        label: i18n.translate(
          'xpack.infra.metricDetailPage.hostMetricsLayout.memoryUsageSection.sectionLabel',
          {
            defaultMessage: 'Memory Usage',
          }
        ),
        requires: ['system.memory'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          stacked: true,
          formatter: InfraFormatterType.bytes,
          type: InfraMetricLayoutVisualizationType.area,
          seriesOverrides: {
            used: { color: theme.eui.euiColorVis2 },
            free: { color: theme.eui.euiColorVis0 },
            cache: { color: theme.eui.euiColorVis1 },
          },
        },
      },
      {
        id: InfraMetric.hostNetworkTraffic,
        label: i18n.translate(
          'xpack.infra.metricDetailPage.hostMetricsLayout.networkTrafficSection.sectionLabel',
          {
            defaultMessage: 'Network Traffic',
          }
        ),
        requires: ['system.network'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          formatter: InfraFormatterType.bits,
          formatterTemplate: '{{value}}/s',
          type: InfraMetricLayoutVisualizationType.area,
          seriesOverrides: {
            rx: {
              color: theme.eui.euiColorVis1,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.hostMetricsLayout.networkTrafficSection.networkRxRateSeriesLabel',
                {
                  defaultMessage: 'in',
                }
              ),
            },
            tx: {
              color: theme.eui.euiColorVis2,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.hostMetricsLayout.networkTrafficSection.networkTxRateSeriesLabel',
                {
                  defaultMessage: 'out',
                }
              ),
            },
          },
        },
      },
    ],
  },
  {
    id: 'k8sOverview',
    label: 'Kubernetes',
    sections: [
      {
        id: InfraMetric.hostK8sOverview,
        linkToId: 'k8sOverview',
        label: i18n.translate(
          'xpack.infra.metricDetailPage.kubernetesMetricsLayout.overviewSection.sectionLabel',
          {
            defaultMessage: 'Overview',
          }
        ),
        requires: ['kubernetes.node'],
        type: InfraMetricLayoutSectionType.gauges,
        visConfig: {
          seriesOverrides: {
            cpucap: {
              name: i18n.translate(
                'xpack.infra.metricDetailPage.kubernetesMetricsLayout.overviewSection.cpuUsageSeriesLabel',
                {
                  defaultMessage: 'CPU Capacity',
                }
              ),
              color: 'secondary',
              formatter: InfraFormatterType.percent,
              gaugeMax: 1,
            },
            load: {
              name: i18n.translate(
                'xpack.infra.metricDetailPage.kubernetesMetricsLayout.overviewSection.loadSeriesLabel',
                {
                  defaultMessage: 'Load (5m)',
                }
              ),
              color: 'secondary',
            },
            memorycap: {
              name: i18n.translate(
                'xpack.infra.metricDetailPage.kubernetesMetricsLayout.overviewSection.memoryUsageSeriesLabel',
                {
                  defaultMessage: 'Memory Capacity',
                }
              ),
              color: 'secondary',
              formatter: InfraFormatterType.percent,
              gaugeMax: 1,
            },
            podcap: {
              name: i18n.translate(
                'xpack.infra.metricDetailPage.kubernetesMetricsLayout.overviewSection.podCapacitySeriesLabel',
                {
                  defaultMessage: 'Pod Capacity',
                }
              ),
              color: 'secondary',
              formatter: InfraFormatterType.percent,
              gaugeMax: 1,
            },
            diskcap: {
              name: i18n.translate(
                'xpack.infra.metricDetailPage.kubernetesMetricsLayout.overviewSection.diskCapacitySeriesLabel',
                {
                  defaultMessage: 'Disk Capacity',
                }
              ),
              color: 'secondary',
              formatter: InfraFormatterType.percent,
              gaugeMax: 1,
            },
          },
        },
      },
      {
        id: InfraMetric.hostK8sCpuCap,
        label: i18n.translate(
          'xpack.infra.metricDetailPage.kubernetesMetricsLayout.nodeCpuCapacitySection.sectionLabel',
          {
            defaultMessage: 'Node CPU Capacity',
          }
        ),
        requires: ['kubernetes.node'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          formatter: InfraFormatterType.abbreviatedNumber,
          seriesOverrides: {
            capacity: { color: theme.eui.euiColorVis2 },
            used: { color: theme.eui.euiColorVis1, type: InfraMetricLayoutVisualizationType.area },
          },
        },
      },
      {
        id: InfraMetric.hostK8sMemoryCap,
        label: i18n.translate(
          'xpack.infra.metricDetailPage.kubernetesMetricsLayout.nodeMemoryCapacitySection.sectionLabel',
          {
            defaultMessage: 'Node Memory Capacity',
          }
        ),
        requires: ['kubernetes.node'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          formatter: InfraFormatterType.bytes,
          seriesOverrides: {
            capacity: { color: theme.eui.euiColorVis2 },
            used: { color: theme.eui.euiColorVis1, type: InfraMetricLayoutVisualizationType.area },
          },
        },
      },
      {
        id: InfraMetric.hostK8sDiskCap,
        label: i18n.translate(
          'xpack.infra.metricDetailPage.kubernetesMetricsLayout.nodeDiskCapacitySection.sectionLabel',
          {
            defaultMessage: 'Node Disk Capacity',
          }
        ),
        requires: ['kubernetes.node'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          formatter: InfraFormatterType.bytes,
          seriesOverrides: {
            capacity: { color: theme.eui.euiColorVis2 },
            used: { color: theme.eui.euiColorVis1, type: InfraMetricLayoutVisualizationType.area },
          },
        },
      },
      {
        id: InfraMetric.hostK8sPodCap,
        label: i18n.translate(
          'xpack.infra.metricDetailPage.kubernetesMetricsLayout.nodePodCapacitySection.sectionLabel',
          {
            defaultMessage: 'Node Pod Capacity',
          }
        ),
        requires: ['kubernetes.node'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          formatter: InfraFormatterType.number,
          seriesOverrides: {
            capacity: { color: theme.eui.euiColorVis2 },
            used: { color: theme.eui.euiColorVis1, type: InfraMetricLayoutVisualizationType.area },
          },
        },
      },
    ],
  },
  ...nginxLayoutCreator(theme),
];
