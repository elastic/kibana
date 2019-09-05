/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

import {
  InfraSnapshotMetricInput,
  InfraSnapshotMetricType,
  InfraNodeType,
} from '../../graphql/types';

interface Props {
  nodeType: InfraNodeType;
  metric: InfraSnapshotMetricInput;
  onChange: (metric: InfraSnapshotMetricInput) => void;
}

let OPTIONS: { [P in InfraNodeType]: Array<{ text: string; value: InfraSnapshotMetricType }> };
const getOptions = (
  nodeType: InfraNodeType
): Array<{ text: string; value: InfraSnapshotMetricType }> => {
  if (!OPTIONS) {
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

    OPTIONS = {
      [InfraNodeType.pod]: [
        {
          text: CPUUsage,
          value: InfraSnapshotMetricType.cpu,
        },
        {
          text: MemoryUsage,
          value: InfraSnapshotMetricType.memory,
        },
        {
          text: InboundTraffic,
          value: InfraSnapshotMetricType.rx,
        },
        {
          text: OutboundTraffic,
          value: InfraSnapshotMetricType.tx,
        },
      ],
      [InfraNodeType.container]: [
        {
          text: CPUUsage,
          value: InfraSnapshotMetricType.cpu,
        },
        {
          text: MemoryUsage,
          value: InfraSnapshotMetricType.memory,
        },
        {
          text: InboundTraffic,
          value: InfraSnapshotMetricType.rx,
        },
        {
          text: OutboundTraffic,
          value: InfraSnapshotMetricType.tx,
        },
      ],
      [InfraNodeType.host]: [
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
      ],
    };
  }

  return OPTIONS[nodeType];
};

const initialState = {
  isPopoverOpen: false,
};
type State = Readonly<typeof initialState>;

export const WaffleMetricControls = class extends React.PureComponent<Props, State> {
  public static displayName = 'WaffleMetricControls';
  public readonly state: State = initialState;
  public render() {
    const { metric, nodeType } = this.props;
    const options = getOptions(nodeType);
    const value = metric.type;

    if (!options.length || !value) {
      throw Error(
        i18n.translate('xpack.infra.waffle.unableToSelectMetricErrorTitle', {
          defaultMessage: 'Unable to select options or value for metric.',
        })
      );
    }
    const currentLabel = options.find(o => o.value === metric.type);
    if (!currentLabel) {
      return 'null';
    }
    const panels: EuiContextMenuPanelDescriptor[] = [
      {
        id: 0,
        title: '',
        items: options.map(o => {
          const icon = o.value === metric.type ? 'check' : 'empty';
          const panel = { name: o.text, onClick: this.handleClick(o.value), icon };
          return panel;
        }),
      },
    ];
    const button = (
      <EuiFilterButton iconType="arrowDown" onClick={this.handleToggle}>
        <FormattedMessage
          id="xpack.infra.waffle.metricButtonLabel"
          defaultMessage="Metric: {selectedMetric}"
          values={{ selectedMetric: currentLabel.text }}
        />
      </EuiFilterButton>
    );

    return (
      <EuiFilterGroup>
        <EuiPopover
          isOpen={this.state.isPopoverOpen}
          id="metricsPanel"
          button={button}
          panelPaddingSize="none"
          closePopover={this.handleClose}
        >
          <EuiContextMenu initialPanelId={0} panels={panels} />
        </EuiPopover>
      </EuiFilterGroup>
    );
  }
  private handleClose = () => {
    this.setState({ isPopoverOpen: false });
  };

  private handleToggle = () => {
    this.setState(state => ({ isPopoverOpen: !state.isPopoverOpen }));
  };

  private handleClick = (value: InfraSnapshotMetricType) => () => {
    this.props.onChange({ type: value });
    this.handleClose();
  };
};
