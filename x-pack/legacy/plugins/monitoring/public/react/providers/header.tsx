/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';

import {
  EuiSuperDatePicker,
  EuiSpacer,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem
} from '@elastic/eui';

type TimeRange = {
  start: string,
  end: string
  refreshInterval?: number
}

type State = {
  recentlyUsedRanges: TimeRange[],
  refreshInterval?: number,
  isLoading: boolean,
  showUpdateButton: boolean,
  isAutoRefreshOnly: boolean,
  isPaused?: boolean | undefined
  start?: string,
  end?: string,
}

type Props = {
  onRefresh?: (_: string) => void
  title?: string
}

const MAX_RECENT: number = 5;

const Title = ({ title }: { title?: string }) => {
  if (!title || !title.trim().length) {
    return null;
  }
  return (
    <EuiFlexItem style={{ minWidth: 300 }}>
      <EuiTitle>
        <h2>{title}</h2>
      </EuiTitle>
    </EuiFlexItem>
  );
};

export class Header extends Component<Props, State> {
  state: State = {
    recentlyUsedRanges: [],
    refreshInterval: 10000,
    isLoading: false,
    showUpdateButton: true,
    isAutoRefreshOnly: false,
    start: 'now-1h',
    end: 'now',
    isPaused: false
  };

  onTimeChange = ({ start, end }: TimeRange) => {
    this.setState((prevState: State) => {
      let recentlyUsedRanges = prevState.recentlyUsedRanges.filter((range: TimeRange) => {
        return range.start !== start || range.end !== end;
      });

      recentlyUsedRanges.unshift({ start, end });
      recentlyUsedRanges = recentlyUsedRanges.slice(0, MAX_RECENT - 1);

      return { start, end, recentlyUsedRanges, isLoading: true };
    }, this.startLoading);
  };

  onRefresh = ({ start, end, refreshInterval }: TimeRange) => {
    return new Promise(resolve => {
      setTimeout(() => {
        this.props && this.props.onRefresh && this.props.onRefresh('tick');
        resolve();
      }, 100);
    }).then(() => {
      console.log(start, end, refreshInterval);
    });
  };

  startLoading = () => {
    setTimeout(this.stopLoading, 1000);
  };

  stopLoading = () => {
    this.setState({ isLoading: false });
  };

  onRefreshChange = ({ isPaused, refreshInterval }: Partial<State>) => {
    this.setState({ isPaused, refreshInterval });
  };

  render() {
    return (
      <EuiFlexGroup wrap>
        <Title {...{ title: this.props.title }} />
        <EuiFlexItem style={{ minWidth: 300 }}>
          <EuiSuperDatePicker
            isLoading={this.state.isLoading}
            start={this.state.start}
            end={this.state.end}
            onTimeChange={this.onTimeChange}
            onRefresh={this.onRefresh}
            isPaused={this.state.isPaused}
            refreshInterval={this.state.refreshInterval}
            onRefreshChange={this.onRefreshChange}
            recentlyUsedRanges={this.state.recentlyUsedRanges}
            isAutoRefreshOnly={this.state.isAutoRefreshOnly}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
