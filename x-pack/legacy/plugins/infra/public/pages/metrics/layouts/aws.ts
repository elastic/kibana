/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { InfraMetric } from '../../../graphql/types';
import { InfraFormatterType } from '../../../lib/lib';
import {
  InfraMetricLayoutCreator,
  InfraMetricLayoutSectionType,
  InfraMetricLayoutVisualizationType,
} from './types';

export const awsLayoutCreator: InfraMetricLayoutCreator = theme => [
  {
    id: 'awsOverview',
    label: 'AWS',
    requires: ['aws'],
    sections: [
      {
        id: InfraMetric.awsOverview,
        linkToId: 'awsOverview',
        label: i18n.translate(
          'xpack.infra.metricDetailPage.awsMetricsLayout.overviewSection.sectionLabel',
          {
            defaultMessage: 'Overview',
          }
        ),
        requires: ['aws.ec2'],
        type: InfraMetricLayoutSectionType.gauges,
        visConfig: {
          seriesOverrides: {
            'cpu-util': {
              name: i18n.translate(
                'xpack.infra.metricDetailPage.awsMetricsLayout.overviewSection.cpuUtilizationSeriesLabel',
                {
                  defaultMessage: 'CPU Utilization',
                }
              ),
              color: theme.eui.euiColorFullShade,
              formatter: InfraFormatterType.percent,
              gaugeMax: 1,
            },
            'status-check-failed': {
              name: i18n.translate(
                'xpack.infra.metricDetailPage.awsMetricsLayout.overviewSection.statusCheckFailedLabel',
                {
                  defaultMessage: 'Status check failed',
                }
              ),
              color: theme.eui.euiColorFullShade,
            },
            rx: {
              name: i18n.translate(
                'xpack.infra.metricDetailPage.awsMetricsLayout.overviewSection.networkRxSeriesLabel',
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
                'xpack.infra.metricDetailPage.awsMetricsLayout.overviewSection.networkTxSeriesLabel',
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
        id: InfraMetric.awsCpuUtilization,
        label: i18n.translate(
          'xpack.infra.metricDetailPage.awsMetricsLayout.cpuUtilSection.sectionLabel',
          {
            defaultMessage: 'CPU Utilization',
          }
        ),
        requires: ['aws.ec2'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          type: InfraMetricLayoutVisualizationType.area,
          formatter: InfraFormatterType.number,
          seriesOverrides: {
            'cpu-util': {
              color: theme.eui.euiColorVis1,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.awsMetricsLayout.cpuUtilSection.percentSeriesLabel',
                {
                  defaultMessage: 'percent',
                }
              ),
            },
          },
        },
      },
      {
        id: InfraMetric.awsNetworkBytes,
        label: i18n.translate(
          'xpack.infra.metricDetailPage.awsMetricsLayout.networkBytesSection.sectionLabel',
          {
            defaultMessage: 'Network Traffic',
          }
        ),
        requires: ['aws.ec2'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          type: InfraMetricLayoutVisualizationType.area,
          formatter: InfraFormatterType.bits,
          formatterTemplate: '{{value}}/s',
          seriesOverrides: {
            tx: {
              color: theme.eui.euiColorVis1,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.awsMetricsLayout.networkBytesSection.txSeriesLabel',
                {
                  defaultMessage: 'out',
                }
              ),
            },
            rx: {
              color: theme.eui.euiColorVis2,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.awsMetricsLayout.networkBytesSection.rxSeriesLabel',
                {
                  defaultMessage: 'in',
                }
              ),
            },
          },
        },
      },
      {
        id: InfraMetric.awsNetworkPackets,
        label: i18n.translate(
          'xpack.infra.metricDetailPage.awsMetricsLayout.networkPacketsSection.sectionLabel',
          {
            defaultMessage: 'Network Packets (Average)',
          }
        ),
        requires: ['aws.ec2'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          type: InfraMetricLayoutVisualizationType.area,
          formatter: InfraFormatterType.number,
          seriesOverrides: {
            'packets-out': {
              color: theme.eui.euiColorVis1,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.awsMetricsLayout.networkPacketsSection.packetsOutSeriesLabel',
                {
                  defaultMessage: 'out',
                }
              ),
            },
            'packets-in': {
              color: theme.eui.euiColorVis2,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.awsMetricsLayout.networkPacketsSection.packetsInSeriesLabel',
                {
                  defaultMessage: 'in',
                }
              ),
            },
          },
        },
      },
    ],
  },
];
