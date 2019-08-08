/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { InfraMetric } from '../../../graphql/types';
import { InfraMetricLayoutSectionType, InfraMetricLayout } from './types';
import { InfraMetricCombinedData } from '../../../containers/metrics/with_metrics';
import { isInfraApmMetrics } from '../../../utils/is_infra_metric_data';

export const apmLayoutCreator = (): InfraMetricLayout[] => [
  {
    id: 'apm',
    label: 'APM',
    mapNavItem: (item: InfraMetricLayout, metrics: InfraMetricCombinedData[]) => {
      const apmMetrics = metrics.find(m => m.id === InfraMetric.apmMetrics);
      if (apmMetrics && isInfraApmMetrics(apmMetrics)) {
        return {
          name: item.label,
          id: item.id,
          items: apmMetrics.services.map(service => ({
            id: service.id,
            name: service.id,
            onClick: () => {
              const el = document.getElementById(service.id);
              if (el) {
                el.scrollIntoView();
              }
            },
          })),
        };
      }
    },
    sections: [
      {
        id: InfraMetric.apmMetrics,
        label: i18n.translate(
          'xpack.infra.metricDetailPage.apmMetricsLayout.apmTransactionsSection.sectionLabel',
          {
            defaultMessage: 'APM Transactions',
          }
        ),
        requires: ['apm.transaction'],
        type: InfraMetricLayoutSectionType.apm,
        visConfig: { seriesOverrides: {} },
      },
    ],
  },
];
