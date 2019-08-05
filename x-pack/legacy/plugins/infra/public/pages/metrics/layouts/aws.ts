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
    id: 'aws',
    label: 'AWS',
    requires: ['aws'],
    sections: [
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
                'xpack.infra.metricDetailPage.awsMetricsLayout.cpuUtilSection.cpuUtilPercentSeriesLabel',
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
                'xpack.infra.metricDetailPage.awsMetricsLayout.networkBytesSection.networkTxSeriesLabel',
                {
                  defaultMessage: 'out',
                }
              ),
            },
            rx: {
              color: theme.eui.euiColorVis2,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.awsMetricsLayout.networkBytesSection.networkRxSeriesLabel',
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
