/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { InventoryDetailLayoutCreator } from '../../types';

export const awsLayoutCreator: InventoryDetailLayoutCreator = theme => [
  {
    id: 'awsOverview',
    label: 'AWS',
    sections: [
      {
        id: 'awsOverview',
        linkToId: 'awsOverview',
        label: i18n.translate(
          'xpack.infra.metricDetailPage.awsMetricsLayout.overviewSection.sectionLabel',
          {
            defaultMessage: 'Overview',
          }
        ),
        requires: ['aws.ec2'],
        type: 'gauges',
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
              formatter: 'percent',
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
            'packets-in': {
              name: i18n.translate(
                'xpack.infra.metricDetailPage.awsMetricsLayout.overviewSection.networkPacketsInLabel',
                {
                  defaultMessage: 'Packets (in)',
                }
              ),
              color: theme.eui.euiColorFullShade,
              formatter: 'number',
            },
            'packets-out': {
              name: i18n.translate(
                'xpack.infra.metricDetailPage.awsMetricsLayout.overviewSection.networkPacketsOutLabel',
                {
                  defaultMessage: 'Packets (out)',
                }
              ),
              color: theme.eui.euiColorFullShade,
              formatter: 'number',
            },
          },
        },
      },
      {
        id: 'awsCpuUtilization',
        label: i18n.translate(
          'xpack.infra.metricDetailPage.awsMetricsLayout.cpuUtilSection.sectionLabel',
          {
            defaultMessage: 'CPU Utilization',
          }
        ),
        requires: ['aws.ec2'],
        type: 'chart',
        visConfig: {
          type: 'area',
          formatter: 'number',
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
        id: 'awsNetworkBytes',
        label: i18n.translate(
          'xpack.infra.metricDetailPage.awsMetricsLayout.networkBytesSection.sectionLabel',
          {
            defaultMessage: 'Network Traffic',
          }
        ),
        requires: ['aws.ec2'],
        type: 'chart',
        visConfig: {
          type: 'area',
          formatter: 'bits',
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
        id: 'awsNetworkPackets',
        label: i18n.translate(
          'xpack.infra.metricDetailPage.awsMetricsLayout.networkPacketsSection.sectionLabel',
          {
            defaultMessage: 'Network Packets (Average)',
          }
        ),
        requires: ['aws.ec2'],
        type: 'chart',
        visConfig: {
          type: 'area',
          formatter: 'number',
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
      {
        id: 'awsDiskioOps',
        label: i18n.translate(
          'xpack.infra.metricDetailPage.awsMetricsLayout.diskioOperationsSection.sectionLabel',
          {
            defaultMessage: 'Disk I/O Operations',
          }
        ),
        requires: ['aws.ec2'],
        type: 'chart',
        visConfig: {
          type: 'area',
          formatter: 'number',
          seriesOverrides: {
            writes: {
              color: theme.eui.euiColorVis1,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.awsMetricsLayout.diskioOperationsSection.writesSeriesLabel',
                {
                  defaultMessage: 'writes',
                }
              ),
            },
            reads: {
              color: theme.eui.euiColorVis2,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.awsMetricsLayout.diskioOperationsSection.readsSeriesLabel',
                {
                  defaultMessage: 'reads',
                }
              ),
            },
          },
        },
      },
      {
        id: 'awsDiskioBytes',
        label: i18n.translate(
          'xpack.infra.metricDetailPage.awsMetricsLayout.diskioBytesSection.sectionLabel',
          {
            defaultMessage: 'Disk I/O Bytes',
          }
        ),
        requires: ['aws.ec2'],
        type: 'chart',
        visConfig: {
          type: 'area',
          formatter: 'number',
          seriesOverrides: {
            writes: {
              color: theme.eui.euiColorVis1,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.awsMetricsLayout.diskioBytesSection.writesSeriesLabel',
                {
                  defaultMessage: 'writes',
                }
              ),
            },
            reads: {
              color: theme.eui.euiColorVis2,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.awsMetricsLayout.diskioBytesSection.readsSeriesLabel',
                {
                  defaultMessage: 'reads',
                }
              ),
            },
          },
        },
      },
    ],
  },
];
