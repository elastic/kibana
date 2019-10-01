/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ToolbarProps } from './toolbar';
import { WithSource } from '../../../containers/with_source';
import { WithWaffleOptions } from '../../../containers/waffle/with_waffle_options';
import { WaffleMetricControls } from '../../waffle/waffle_metric_controls';
import { WaffleGroupByControls } from '../../waffle/waffle_group_by_controls';
import { Toolbar } from '../../eui/toolbar';
import { InfraSnapshotMetricType } from '../../../graphql/types';
import { fieldToName } from '../../waffle/lib/field_to_display_name';

export const HostToolbar = (props: ToolbarProps) => {
  const metricOptions = useMemo(() => {
    const CPUUsage = i18n.translate('xpack.infra.waffle.metricOptions.cpuUsageText', {
      defaultMessage: 'CPU usage',
    });

    const MemoryUsage = i18n.translate('xpack.infra.waffle.metricOptions.memoryUsageText', {
      defaultMessage: 'Memory usage',
    });

    const InboundTraffic = i18n.translate('xpack.infra.waffle.metricOptions.inboundTrafficText', {
      defaultMessage: 'Inbound traffic',
    });

    const OutboundTraffic = i18n.translate('xpack.infra.waffle.metricOptions.outboundTrafficText', {
      defaultMessage: 'Outbound traffic',
    });

    const LogRate = i18n.translate('xpack.infra.waffle.metricOptions.hostLogRateText', {
      defaultMessage: 'Log rate',
    });

    const Load = i18n.translate('xpack.infra.waffle.metricOptions.loadText', {
      defaultMessage: 'Load',
    });

    return [
      {
        text: CPUUsage,
        value: InfraSnapshotMetricType.cpu,
      },
      {
        text: MemoryUsage,
        value: InfraSnapshotMetricType.memory,
      },
      {
        text: Load,
        value: InfraSnapshotMetricType.load,
      },
      {
        text: InboundTraffic,
        value: InfraSnapshotMetricType.rx,
      },
      {
        text: OutboundTraffic,
        value: InfraSnapshotMetricType.tx,
      },
      {
        text: LogRate,
        value: InfraSnapshotMetricType.logRate,
      },
    ];
  }, []);

  const groupByOptions = useMemo(() => {
    const mapFieldToOption = (field: string) => ({
      text: fieldToName(field),
      field,
    });
    return [
      'cloud.availability_zone',
      'cloud.machine.type',
      'cloud.project.id',
      'cloud.provider',
      'service.type',
    ].map(mapFieldToOption);
  }, []);

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
              }) => (
                <>
                  <EuiFlexItem grow={false}>
                    <WaffleMetricControls
                      options={metricOptions}
                      metric={metric}
                      onChange={changeMetric}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <WaffleGroupByControls
                      options={groupByOptions}
                      groupBy={groupBy}
                      nodeType={nodeType}
                      onChange={changeGroupBy}
                      fields={createDerivedIndexPattern('metrics').fields}
                      onChangeCustomOptions={changeCustomOptions}
                      customOptions={customOptions}
                    />
                  </EuiFlexItem>
                </>
              )}
            </WithWaffleOptions>
          )}
        </WithSource>
      </EuiFlexGroup>
    </Toolbar>
  );
};
