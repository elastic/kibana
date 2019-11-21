/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { SummaryStatus } from '../../summary_status';
import { KibanaStatusIcon } from '../status_icon';
import { formatMetric } from '../../../lib/format_number';
import { i18n } from '@kbn/i18n';

export function ClusterStatus({ stats }) {
  const {
    concurrent_connections: connections,
    count: instances,
    memory_limit: memLimit,
    memory_size: memSize,
    requests_total: requests,
    response_time_max: maxResponseTime,
    status,
  } = stats;

  const metrics = [
    {
      label: i18n.translate('xpack.monitoring.kibana.clusterStatus.instancesLabel', {
        defaultMessage: 'Instances'
      }),
      value: instances,
      'data-test-subj': 'instances'
    },
    {
      label: i18n.translate('xpack.monitoring.kibana.clusterStatus.memoryLabel', {
        defaultMessage: 'Memory'
      }),
      value: formatMetric(memSize, 'byte') + ' / ' + formatMetric(memLimit, 'byte'),
      'data-test-subj': 'memory'
    },
    {
      label: i18n.translate('xpack.monitoring.kibana.clusterStatus.requestsLabel', {
        defaultMessage: 'Requests'
      }),
      value: requests,
      'data-test-subj': 'requests'
    },
    {
      label: i18n.translate('xpack.monitoring.kibana.clusterStatus.connectionsLabel', {
        defaultMessage: 'Connections'
      }),
      value: connections,
      'data-test-subj': 'connections'
    },
    {
      label: i18n.translate('xpack.monitoring.kibana.clusterStatus.maxResponseTimeLabel', {
        defaultMessage: 'Max. Response Time'
      }),
      value: formatMetric(maxResponseTime, '0', 'ms'),
      'data-test-subj': 'maxResponseTime'
    }
  ];

  const IconComponent = ({ status }) => (
    <KibanaStatusIcon status={status} />
  );

  return (
    <SummaryStatus
      metrics={metrics}
      status={status}
      IconComponent={IconComponent}
      data-test-subj="kibanaClusterStatus"
    />
  );
}
