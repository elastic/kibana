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
  SnapshotMetricInput,
  SnapshotCustomMetricInput,
  SnapshotCustomMetricInputRT,
} from '../../../common/http_api/snapshot_api';
import { SnapshotMetricType } from '../../../common/inventory_models/types';

interface Props {
  options: Array<{ text: string; value: string }>;
  metric: SnapshotMetricInput;
  onChange: (metric: SnapshotMetricInput) => void;
  onChangeCustomMetrics: (metrics: SnapshotCustomMetricInput[]) => void;
  customMetrics: SnapshotCustomMetricInput[];
}

const getCustomMetricLabel = (metric: SnapshotCustomMetricInput) => {
  const METRIC_LABELS = {
    avg: i18n.translate('xpack.infra.waffle.aggregationNames.avg', {
      defaultMessage: 'Avg of {field}',
      values: { field: metric.field },
    }),
    max: i18n.translate('xpack.infra.waffle.aggregationNames.max', {
      defaultMessage: 'Max of {field}',
      values: { field: metric.field },
    }),
    min: i18n.translate('xpack.infra.waffle.aggregationNames.min', {
      defaultMessage: 'Min of {field}',
      values: { field: metric.field },
    }),
    rate: i18n.translate('xpack.infra.waffle.aggregationNames.rate', {
      defaultMessage: 'Rate of {field}',
      values: { field: metric.field },
    }),
  };
  return metric.label ? metric.label : METRIC_LABELS[metric.aggregation];
};

const initialState = {
  isPopoverOpen: false,
};
type State = Readonly<typeof initialState>;

export const WaffleMetricControls = class extends React.PureComponent<Props, State> {
  public static displayName = 'WaffleMetricControls';
  public readonly state: State = initialState;
  public render() {
    const { metric, options, customMetrics } = this.props;
    const value = metric.type;

    if (!options.length || !value) {
      throw Error(
        i18n.translate('xpack.infra.waffle.unableToSelectMetricErrorTitle', {
          defaultMessage: 'Unable to select options or value for metric.',
        })
      );
    }
    const optionsWithCustomMetrics = options.concat(
      customMetrics.map((m, index) => ({
        text: getCustomMetricLabel(m),
        value: `${m.type}-${index}`,
      }))
    );

    const id = SnapshotCustomMetricInputRT.is(metric) && metric.id ? metric.id : metric.type;
    const currentLabel = optionsWithCustomMetrics.find(o => o.value === id);
    if (!currentLabel) {
      return null;
    }

    const panels: EuiContextMenuPanelDescriptor[] = [
      {
        id: 0,
        title: '',
        items: optionsWithCustomMetrics.map(o => {
          const icon = o.value === id ? 'check' : 'empty';
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
          anchorPosition="downLeft"
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

  private handleClick = (value: string) => () => {
    const matches = value.match(/^custom-([0-9]+)/);
    if (matches) {
      const customIndex = Number(matches[1]);
      const metric = this.props.customMetrics[customIndex];
      if (metric) {
        this.props.onChange({ ...metric, id: value });
      }
    } else {
      this.props.onChange({ type: value as SnapshotMetricType });
    }
    this.handleClose();
  };
};
