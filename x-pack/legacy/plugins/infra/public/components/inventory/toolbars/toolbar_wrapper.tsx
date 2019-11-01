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
  children: (props: ToolbarProps) => React.ReactElement;
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
                customOptions,
                groupBy,
                metric,
                nodeType,
              }) =>
                props.children({
                  createDerivedIndexPattern,
                  changeMetric,
                  changeGroupBy,
                  changeCustomOptions,
                  customOptions,
                  groupBy,
                  metric,
                  nodeType,
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
  }
};
