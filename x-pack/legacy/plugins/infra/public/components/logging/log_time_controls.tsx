/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiDatePicker, EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import moment, { Moment } from 'moment';
import React from 'react';

const noop = () => undefined;

interface LogTimeControlsProps {
  currentTime: number | null;
  startLiveStreaming: (interval: number) => any;
  stopLiveStreaming: () => any;
  isLiveStreaming: boolean;
  jumpToTime: (time: number) => any;
  intl: InjectedIntl;
}

class LogTimeControlsUI extends React.PureComponent<LogTimeControlsProps> {
  public render() {
    const { currentTime, isLiveStreaming, intl } = this.props;

    const currentMoment = currentTime ? moment(currentTime) : null;

    if (isLiveStreaming) {
      return (
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem>
            <EuiDatePicker
              disabled
              onChange={noop}
              value={intl.formatMessage({
                id: 'xpack.infra.logs.streamingDescription',
                defaultMessage: 'Streaming new entries…',
              })}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              color="primary"
              iconType="pause"
              iconSide="left"
              onClick={this.stopLiveStreaming}
            >
              <FormattedMessage
                id="xpack.infra.logs.stopStreamingButtonLabel"
                defaultMessage="Stop streaming"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    } else {
      return (
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem>
            <EuiDatePicker
              dateFormat="L LTS"
              onChange={this.handleChangeDate}
              popperPlacement="top-end"
              selected={currentMoment}
              shouldCloseOnSelect
              showTimeSelect
              timeFormat="LTS"
              injectTimes={currentMoment ? [currentMoment] : []}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="play" iconSide="left" onClick={this.startLiveStreaming}>
              <FormattedMessage
                id="xpack.infra.logs.startStreamingButtonLabel"
                defaultMessage="Stream live"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }
  }

  private handleChangeDate = (date: Moment | null) => {
    if (date !== null) {
      this.props.jumpToTime(date.valueOf());
    }
  };

  private startLiveStreaming = () => {
    this.props.startLiveStreaming(5000);
  };

  private stopLiveStreaming = () => {
    this.props.stopLiveStreaming();
  };
}

export const LogTimeControls = injectI18n(LogTimeControlsUI);
