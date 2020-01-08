/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { WithSource } from '../../../containers/with_source';
import { WithWaffleOptions } from '../../../containers/waffle/with_waffle_options';
import { Toolbar } from '../../eui/toolbar';
import { ToolbarProps } from './toolbar';
import { fieldToName } from '../../waffle/lib/field_to_display_name';
import { InfraSnapshotMetricType } from '../../../graphql/types';

interface Props {
  children: (props: Omit<ToolbarProps, 'accounts' | 'regions'>) => React.ReactElement;
}

export const ToolbarWrapper = (props: Props) => {
  return (
    <Toolbar>
      <EuiFlexGroup alignItems="center" gutterSize="m">
        <WithSource>
          {({ createDerivedIndexPattern }) => (
            <WithWaffleOptions>
              {({
                changeMetric,
                changeGroupBy,
                changeCustomOptions,
                changeAccount,
                changeRegion,
                customOptions,
                groupBy,
                metric,
                nodeType,
                accountId,
                region,
              }) =>
                props.children({
                  createDerivedIndexPattern,
                  changeMetric,
                  changeGroupBy,
                  changeAccount,
                  changeRegion,
                  changeCustomOptions,
                  customOptions,
                  groupBy,
                  metric,
                  nodeType,
                  region,
                  accountId,
                })
              }
            </WithWaffleOptions>
          )}
        </WithSource>
      </EuiFlexGroup>
    </Toolbar>
  );
};

const ToolbarTranslations = {
  CPUUsage: i18n.translate('xpack.infra.waffle.metricOptions.cpuUsageText', {
    defaultMessage: 'CPU usage',
  }),

  MemoryUsage: i18n.translate('xpack.infra.waffle.metricOptions.memoryUsageText', {
    defaultMessage: 'Memory usage',
  }),

  InboundTraffic: i18n.translate('xpack.infra.waffle.metricOptions.inboundTrafficText', {
    defaultMessage: 'Inbound traffic',
  }),

  OutboundTraffic: i18n.translate('xpack.infra.waffle.metricOptions.outboundTrafficText', {
    defaultMessage: 'Outbound traffic',
  }),

  LogRate: i18n.translate('xpack.infra.waffle.metricOptions.hostLogRateText', {
    defaultMessage: 'Log rate',
  }),

  Load: i18n.translate('xpack.infra.waffle.metricOptions.loadText', {
    defaultMessage: 'Load',
  }),

  Count: i18n.translate('xpack.infra.waffle.metricOptions.countText', {
    defaultMessage: 'Count',
  }),
  DiskIOReadBytes: i18n.translate('xpack.infra.waffle.metricOptions.diskIOReadBytes', {
    defaultMessage: 'Disk Reads',
  }),
  DiskIOWriteBytes: i18n.translate('xpack.infra.waffle.metricOptions.diskIOWriteBytes', {
    defaultMessage: 'Disk Writes',
  }),
  s3BucketSize: i18n.translate('xpack.infra.waffle.metricOptions.s3BucketSize', {
    defaultMessage: 'Bucket Size',
  }),
  s3TotalRequests: i18n.translate('xpack.infra.waffle.metricOptions.s3TotalRequests', {
    defaultMessage: 'Total Requests',
  }),
  s3NumberOfObjects: i18n.translate('xpack.infra.waffle.metricOptions.s3NumberOfObjects', {
    defaultMessage: 'Number of Objects',
  }),
  s3DownloadBytes: i18n.translate('xpack.infra.waffle.metricOptions.s3DownloadBytes', {
    defaultMessage: 'Downloads (Bytes)',
  }),
  s3UploadBytes: i18n.translate('xpack.infra.waffle.metricOptions.s3UploadBytes', {
    defaultMessage: 'Uploads (Bytes)',
  }),
  rdsConnections: i18n.translate('xpack.infra.waffle.metricOptions.rdsConnections', {
    defaultMessage: 'Connections',
  }),
  rdsQueriesExecuted: i18n.translate('xpack.infra.waffle.metricOptions.rdsQueriesExecuted', {
    defaultMessage: 'Queries Executed',
  }),
  rdsActiveTransactions: i18n.translate('xpack.infra.waffle.metricOptions.rdsActiveTransactions', {
    defaultMessage: 'Active Transactions',
  }),
  rdsLatency: i18n.translate('xpack.infra.waffle.metricOptions.rdsLatency', {
    defaultMessage: 'Latency',
  }),
  sqsMessagesVisible: i18n.translate('xpack.infra.waffle.metricOptions.sqsMessagesVisible', {
    defaultMessage: 'Messages Available',
  }),
  sqsMessagesDelayed: i18n.translate('xpack.infra.waffle.metricOptions.sqsMessagesDelayed', {
    defaultMessage: 'Messages Delayed',
  }),
  sqsMessagesSent: i18n.translate('xpack.infra.waffle.metricOptions.sqsMessagesSent', {
    defaultMessage: 'Messages Added',
  }),
  sqsMessagesEmpty: i18n.translate('xpack.infra.waffle.metricOptions.sqsMessagesEmpty', {
    defaultMessage: 'Messages Returned Empty',
  }),
  sqsOldestMessage: i18n.translate('xpack.infra.waffle.metricOptions.sqsOldestMessage', {
    defaultMessage: 'Oldest Message',
  }),
};

export const toGroupByOpt = (field: string) => ({
  text: fieldToName(field),
  field,
});

export const toMetricOpt = (metric: InfraSnapshotMetricType) => {
  switch (metric) {
    case InfraSnapshotMetricType.cpu:
      return {
        text: ToolbarTranslations.CPUUsage,
        value: InfraSnapshotMetricType.cpu,
      };
    case InfraSnapshotMetricType.memory:
      return {
        text: ToolbarTranslations.MemoryUsage,
        value: InfraSnapshotMetricType.memory,
      };
    case InfraSnapshotMetricType.rx:
      return {
        text: ToolbarTranslations.InboundTraffic,
        value: InfraSnapshotMetricType.rx,
      };
    case InfraSnapshotMetricType.tx:
      return {
        text: ToolbarTranslations.OutboundTraffic,
        value: InfraSnapshotMetricType.tx,
      };
    case InfraSnapshotMetricType.logRate:
      return {
        text: ToolbarTranslations.LogRate,
        value: InfraSnapshotMetricType.logRate,
      };
    case InfraSnapshotMetricType.load:
      return {
        text: ToolbarTranslations.Load,
        value: InfraSnapshotMetricType.load,
      };

    case InfraSnapshotMetricType.count:
      return {
        text: ToolbarTranslations.Count,
        value: InfraSnapshotMetricType.count,
      };
    case InfraSnapshotMetricType.diskIOReadBytes:
      return {
        text: ToolbarTranslations.DiskIOReadBytes,
        value: InfraSnapshotMetricType.diskIOReadBytes,
      };
    case InfraSnapshotMetricType.diskIOWriteBytes:
      return {
        text: ToolbarTranslations.DiskIOWriteBytes,
        value: InfraSnapshotMetricType.diskIOWriteBytes,
      };
    case InfraSnapshotMetricType.s3BucketSize:
      return {
        text: ToolbarTranslations.s3BucketSize,
        value: InfraSnapshotMetricType.s3BucketSize,
      };
    case InfraSnapshotMetricType.s3TotalRequests:
      return {
        text: ToolbarTranslations.s3TotalRequests,
        value: InfraSnapshotMetricType.s3TotalRequests,
      };
    case InfraSnapshotMetricType.s3NumberOfObjects:
      return {
        text: ToolbarTranslations.s3NumberOfObjects,
        value: InfraSnapshotMetricType.s3NumberOfObjects,
      };
    case InfraSnapshotMetricType.s3DownloadBytes:
      return {
        text: ToolbarTranslations.s3DownloadBytes,
        value: InfraSnapshotMetricType.s3DownloadBytes,
      };
    case InfraSnapshotMetricType.s3UploadBytes:
      return {
        text: ToolbarTranslations.s3UploadBytes,
        value: InfraSnapshotMetricType.s3UploadBytes,
      };
    case InfraSnapshotMetricType.rdsConnections:
      return {
        text: ToolbarTranslations.rdsConnections,
        value: InfraSnapshotMetricType.rdsConnections,
      };
    case InfraSnapshotMetricType.rdsQueriesExecuted:
      return {
        text: ToolbarTranslations.rdsQueriesExecuted,
        value: InfraSnapshotMetricType.rdsQueriesExecuted,
      };
    case InfraSnapshotMetricType.rdsActiveTransactions:
      return {
        text: ToolbarTranslations.rdsActiveTransactions,
        value: InfraSnapshotMetricType.rdsActiveTransactions,
      };
    case InfraSnapshotMetricType.rdsLatency:
      return {
        text: ToolbarTranslations.rdsLatency,
        value: InfraSnapshotMetricType.rdsLatency,
      };
    case InfraSnapshotMetricType.sqsMessagesVisible:
      return {
        text: ToolbarTranslations.sqsMessagesVisible,
        value: InfraSnapshotMetricType.sqsMessagesVisible,
      };
    case InfraSnapshotMetricType.sqsMessagesDelayed:
      return {
        text: ToolbarTranslations.sqsMessagesDelayed,
        value: InfraSnapshotMetricType.sqsMessagesDelayed,
      };
    case InfraSnapshotMetricType.sqsMessagesSent:
      return {
        text: ToolbarTranslations.sqsMessagesSent,
        value: InfraSnapshotMetricType.sqsMessagesSent,
      };
    case InfraSnapshotMetricType.sqsMessagesEmpty:
      return {
        text: ToolbarTranslations.sqsMessagesEmpty,
        value: InfraSnapshotMetricType.sqsMessagesEmpty,
      };
    case InfraSnapshotMetricType.sqsOldestMessage:
      return {
        text: ToolbarTranslations.sqsOldestMessage,
        value: InfraSnapshotMetricType.sqsOldestMessage,
      };
  }
};
