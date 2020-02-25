/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { SummaryStatus } from '../../summary_status';
import { formatMetric } from '../../../lib/format_number';
import { i18n } from '@kbn/i18n';

export function DetailStatus({ stats }) {
  const {
    http_address: httpAddress,
    events,
    reloads,
    pipeline,
    queue_type: queueType,
    version,
    uptime,
  } = stats;

  const firstMetrics = [
    {
      label: i18n.translate('xpack.monitoring.logstash.detailStatus.transportAddressLabel', {
        defaultMessage: 'Transport Address',
      }),
      value: httpAddress,
      'data-test-subj': 'httpAddress',
    },
    {
      label: i18n.translate('xpack.monitoring.logstash.detailStatus.eventsReceivedLabel', {
        defaultMessage: 'Events Received',
      }),
      value: formatMetric(events.in, '0.[0]a'),
      'data-test-subj': 'eventsIn',
    },
    {
      label: i18n.translate('xpack.monitoring.logstash.detailStatus.eventsEmittedLabel', {
        defaultMessage: 'Events Emitted',
      }),
      value: formatMetric(events.out, '0.[0]a'),
      'data-test-subj': 'eventsOut',
    },
    {
      label: i18n.translate('xpack.monitoring.logstash.detailStatus.configReloadsLabel', {
        defaultMessage: 'Config Reloads',
      }),
      value: reloads.successes,
      'data-test-subj': 'numReloads',
    },
    {
      label: i18n.translate('xpack.monitoring.logstash.detailStatus.pipelineWorkersLabel', {
        defaultMessage: 'Pipeline Workers',
      }),
      value: pipeline.workers,
      'data-test-subj': 'pipelineWorkers',
    },
    {
      label: i18n.translate('xpack.monitoring.logstash.detailStatus.batchSizeLabel', {
        defaultMessage: 'Batch Size',
      }),
      value: pipeline.batch_size,
      'data-test-subj': 'pipelineBatchSize',
    },
  ];

  const lastMetrics = [
    {
      label: i18n.translate('xpack.monitoring.logstash.detailStatus.versionLabel', {
        defaultMessage: 'Version',
      }),
      value: version,
      'data-test-subj': 'version',
    },
    {
      label: i18n.translate('xpack.monitoring.logstash.detailStatus.uptimeLabel', {
        defaultMessage: 'Uptime',
      }),
      value: formatMetric(uptime, 'time_since'),
      'data-test-subj': 'uptime',
    },
  ];

  // make queueType conditional
  const metrics = [...firstMetrics];
  if (queueType) {
    metrics.push({
      label: i18n.translate('xpack.monitoring.logstash.detailStatus.queueTypeLabel', {
        defaultMessage: 'Queue Type',
      }),
      value: queueType,
      'data-test-subj': 'queueType',
    });
  }
  metrics.push(...lastMetrics);

  return <SummaryStatus metrics={metrics} data-test-subj="logstashDetailStatus" />;
}
