/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { formatMetric } from 'plugins/monitoring/lib/format_number';
import { SummaryStatus } from '../summary_status';
import { i18n } from '@kbn/i18n';

export function Stats({ stats }) {
  const {
    total,
    types,
    stats: { bytesSent, totalEvents },
  } = stats;

  const metrics = [
    {
      label: i18n.translate('xpack.monitoring.beats.overview.totalBeatsLabel', {
        defaultMessage: 'Total Beats',
      }),
      value: formatMetric(total, 'int_commas'),
      'data-test-subj': 'totalBeats',
    },
  ];

  metrics.push(
    ...types.map(({ type, count }) => ({
      label: type,
      value: formatMetric(count, 'int_commas'),
      'data-test-subj': 'typeCount',
      'data-test-type-count': `${type}:${count}`,
    }))
  );

  metrics.push({
    label: i18n.translate('xpack.monitoring.beats.overview.totalEventsLabel', {
      defaultMessage: 'Total Events',
    }),
    value: formatMetric(totalEvents, '0.[0]a'),
    'data-test-subj': 'totalEvents',
  });

  metrics.push({
    label: i18n.translate('xpack.monitoring.beats.overview.bytesSentLabel', {
      defaultMessage: 'Bytes Sent',
    }),
    value: formatMetric(bytesSent, 'byte'),
    'data-test-subj': 'bytesSent',
  });

  return <SummaryStatus metrics={metrics} data-test-subj="beatsSummaryStatus" />;
}
