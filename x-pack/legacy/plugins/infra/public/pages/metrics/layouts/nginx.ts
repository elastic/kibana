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

export const nginxLayoutCreator: InfraMetricLayoutCreator = theme => [
  {
    id: 'nginxOverview',
    label: 'Nginx',
    requires: ['nginx'],
    sections: [
      {
        id: InfraMetric.nginxHits,
        label: i18n.translate(
          'xpack.infra.metricDetailPage.nginxMetricsLayout.hitsSection.sectionLabel',
          {
            defaultMessage: 'Hits',
          }
        ),
        requires: ['nginx.access'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          formatter: InfraFormatterType.abbreviatedNumber,
          stacked: true,
          seriesOverrides: {
            '200s': { color: theme.eui.euiColorVis1, type: InfraMetricLayoutVisualizationType.bar },
            '300s': { color: theme.eui.euiColorVis5, type: InfraMetricLayoutVisualizationType.bar },
            '400s': { color: theme.eui.euiColorVis2, type: InfraMetricLayoutVisualizationType.bar },
            '500s': { color: theme.eui.euiColorVis9, type: InfraMetricLayoutVisualizationType.bar },
          },
        },
      },
      {
        id: InfraMetric.nginxRequestRate,
        label: i18n.translate(
          'xpack.infra.metricDetailPage.nginxMetricsLayout.requestRateSection.sectionLabel',
          {
            defaultMessage: 'Request Rate',
          }
        ),
        requires: ['nginx.stubstatus'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          formatter: InfraFormatterType.abbreviatedNumber,
          formatterTemplate: '{{value}}/s',
          seriesOverrides: {
            rate: { color: theme.eui.euiColorVis1, type: InfraMetricLayoutVisualizationType.area },
          },
        },
      },
      {
        id: InfraMetric.nginxActiveConnections,
        label: i18n.translate(
          'xpack.infra.metricDetailPage.nginxMetricsLayout.activeConnectionsSection.sectionLabel',
          {
            defaultMessage: 'Active Connections',
          }
        ),
        requires: ['nginx.stubstatus'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          formatter: InfraFormatterType.abbreviatedNumber,
          seriesOverrides: {
            connections: {
              color: theme.eui.euiColorVis1,
              type: InfraMetricLayoutVisualizationType.bar,
            },
          },
        },
      },
      {
        id: InfraMetric.nginxRequestsPerConnection,
        label: i18n.translate(
          'xpack.infra.metricDetailPage.nginxMetricsLayout.requestsPerConnectionsSection.sectionLabel',
          {
            defaultMessage: 'Requests per Connections',
          }
        ),
        requires: ['nginx.stubstatus'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          formatter: InfraFormatterType.abbreviatedNumber,
          seriesOverrides: {
            reqPerConns: {
              color: theme.eui.euiColorVis1,
              type: InfraMetricLayoutVisualizationType.bar,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.nginxMetricsLayout.requestsPerConnectionsSection.reqsPerConnSeriesLabel',
                {
                  defaultMessage: 'reqs per conn',
                }
              ),
            },
          },
        },
      },
    ],
  },
];
