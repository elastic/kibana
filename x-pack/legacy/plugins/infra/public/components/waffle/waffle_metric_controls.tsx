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
import { SnapshotMetricInput } from '../../../common/http_api/snapshot_api';
import { SnapshotMetricType } from '../../../common/inventory_models/types';

interface Props {
  options: Array<{ text: string; value: SnapshotMetricType }>;
  metric: SnapshotMetricInput;
  onChange: (metric: SnapshotMetricInput) => void;
}

const initialState = {
  isPopoverOpen: false,
};
type State = Readonly<typeof initialState>;

export const WaffleMetricControls = class extends React.PureComponent<Props, State> {
  public static displayName = 'WaffleMetricControls';
  public readonly state: State = initialState;
  public render() {
    const { metric, options } = this.props;
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
      return null;
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

  private handleClick = (value: SnapshotMetricType) => () => {
    this.props.onChange({ type: value });
    this.handleClose();
  };
};
