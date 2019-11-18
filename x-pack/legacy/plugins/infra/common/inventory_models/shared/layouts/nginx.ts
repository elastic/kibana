/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { InventoryDetailLayoutCreator } from '../../types';

export const nginxLayoutCreator: InventoryDetailLayoutCreator = theme => [
  {
    id: 'nginxOverview',
    label: 'Nginx',
    sections: [
      {
        id: 'nginxHits',
        label: i18n.translate(
          'xpack.infra.metricDetailPage.nginxMetricsLayout.hitsSection.sectionLabel',
          {
            defaultMessage: 'Hits',
          }
        ),
        requires: ['nginx.access'],
        type: 'chart',
        visConfig: {
          formatter: 'abbreviatedNumber',
          stacked: true,
          seriesOverrides: {
            '200s': { color: theme.eui.euiColorVis1, type: 'bar' },
            '300s': { color: theme.eui.euiColorVis5, type: 'bar' },
            '400s': { color: theme.eui.euiColorVis2, type: 'bar' },
            '500s': { color: theme.eui.euiColorVis9, type: 'bar' },
          },
        },
      },
      {
        id: 'nginxRequestRate',
        label: i18n.translate(
          'xpack.infra.metricDetailPage.nginxMetricsLayout.requestRateSection.sectionLabel',
          {
            defaultMessage: 'Request Rate',
          }
        ),
        requires: ['nginx.stubstatus'],
        type: 'chart',
        visConfig: {
          formatter: 'abbreviatedNumber',
          formatterTemplate: '{{value}}/s',
          seriesOverrides: {
            rate: { color: theme.eui.euiColorVis1, type: 'area' },
          },
        },
      },
      {
        id: 'nginxActiveConnections',
        label: i18n.translate(
          'xpack.infra.metricDetailPage.nginxMetricsLayout.activeConnectionsSection.sectionLabel',
          {
            defaultMessage: 'Active Connections',
          }
        ),
        requires: ['nginx.stubstatus'],
        type: 'chart',
        visConfig: {
          formatter: 'abbreviatedNumber',
          seriesOverrides: {
            connections: {
              color: theme.eui.euiColorVis1,
              type: 'bar',
            },
          },
        },
      },
      {
        id: 'nginxRequestsPerConnection',
        label: i18n.translate(
          'xpack.infra.metricDetailPage.nginxMetricsLayout.requestsPerConnectionsSection.sectionLabel',
          {
            defaultMessage: 'Requests per Connections',
          }
        ),
        requires: ['nginx.stubstatus'],
        type: 'chart',
        visConfig: {
          formatter: 'abbreviatedNumber',
          seriesOverrides: {
            reqPerConns: {
              color: theme.eui.euiColorVis1,
              type: 'bar',
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
