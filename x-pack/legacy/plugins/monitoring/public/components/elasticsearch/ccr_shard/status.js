/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { SummaryStatus } from '../../summary_status';
import { formatMetric } from '../../../lib/format_number';
import { i18n } from '@kbn/i18n';

export function Status({ stat, formattedLeader, oldestStat }) {
  const {
    follower_index: followerIndex,
    shard_id: shardId,
    operations_written: operationsReceived,
    failed_read_requests: failedFetches
  } = stat;

  const {
    operations_written: oldestOperationsReceived,
    failed_read_requests: oldestFailedFetches
  } = oldestStat;

  const metrics = [
    {
      label: i18n.translate('xpack.monitoring.elasticsearch.ccrShard.status.followerIndexLabel', {
        defaultMessage: 'Follower Index'
      }),
      value: followerIndex,
      'data-test-subj': 'followerIndex'
    },
    {
      label: i18n.translate('xpack.monitoring.elasticsearch.ccrShard.status.shardIdLabel', {
        defaultMessage: 'Shard Id'
      }),
      value: shardId,
      'data-test-subj': 'shardId'
    },
    {
      label: i18n.translate('xpack.monitoring.elasticsearch.ccrShard.status.leaderIndexLabel', {
        defaultMessage: 'Leader Index'
      }),
      value: formattedLeader,
      'data-test-subj': 'leaderIndex'
    },
    {
      label: i18n.translate('xpack.monitoring.elasticsearch.ccrShard.status.opsSyncedLabel', {
        defaultMessage: 'Ops Synced'
      }),
      value: formatMetric(operationsReceived - oldestOperationsReceived, 'int_commas'),
      'data-test-subj': 'operationsReceived'
    },
    {
      label: i18n.translate('xpack.monitoring.elasticsearch.ccrShard.status.failedFetchesLabel', {
        defaultMessage: 'Failed Fetches'
      }),
      value: formatMetric(failedFetches - oldestFailedFetches, 'int_commas'),
      'data-test-subj': 'failedFetches'
    },
  ];

  return (
    <SummaryStatus
      metrics={metrics}
      data-test-subj="ccrDetailStatus"
    />
  );
}
