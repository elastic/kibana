/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { SummaryStatus } from '../../summary_status';
import { ElasticsearchStatusIcon } from '../status_icon';
import { formatMetric } from '../../../lib/format_number';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { AlertsStatus } from '../../../alerts/status';

export function IndexDetailStatus({ stats, alerts = {} }) {
  const { dataSize, documents: documentCount, totalShards, unassignedShards, status } = stats;

  const metrics = [
    {
      label: i18n.translate('xpack.monitoring.elasticsearch.indexDetailStatus.alerts', {
        defaultMessage: 'Alerts',
      }),
      value: <AlertsStatus alerts={alerts} showOnlyCount={true} />,
    },
    {
      label: i18n.translate('xpack.monitoring.elasticsearch.indexDetailStatus.totalTitle', {
        defaultMessage: 'Total',
      }),
      value: formatMetric(dataSize.total, '0.0 b'),
      'data-test-subj': 'dataSize',
    },
    {
      label: i18n.translate('xpack.monitoring.elasticsearch.indexDetailStatus.primariesTitle', {
        defaultMessage: 'Primaries',
      }),
      value: formatMetric(dataSize.primaries, '0.0 b'),
      'data-test-subj': 'dataSizePrimaries',
    },
    {
      label: i18n.translate('xpack.monitoring.elasticsearch.indexDetailStatus.documentsTitle', {
        defaultMessage: 'Documents',
      }),
      value: formatMetric(documentCount, '0.[0]a'),
      'data-test-subj': 'documentCount',
    },
    {
      label: i18n.translate('xpack.monitoring.elasticsearch.indexDetailStatus.totalShardsTitle', {
        defaultMessage: 'Total shards',
      }),
      value: formatMetric(totalShards, 'int_commas'),
      'data-test-subj': 'totalShards',
    },
    {
      label: i18n.translate(
        'xpack.monitoring.elasticsearch.indexDetailStatus.unassignedShardsTitle',
        {
          defaultMessage: 'Unassigned shards',
        }
      ),
      value: formatMetric(unassignedShards, 'int_commas'),
      'data-test-subj': 'unassignedShards',
    },
  ];

  const IconComponent = ({ status }) => (
    <Fragment>
      <FormattedMessage
        id="xpack.monitoring.elasticsearch.indexDetailStatus.iconStatusLabel"
        defaultMessage="Health: {elasticsearchStatusIcon}"
        values={{
          elasticsearchStatusIcon: <ElasticsearchStatusIcon status={status} />,
        }}
      />
    </Fragment>
  );

  return (
    <SummaryStatus
      metrics={metrics}
      status={status}
      IconComponent={IconComponent}
      data-test-subj="elasticsearchIndexDetailStatus"
    />
  );
}
