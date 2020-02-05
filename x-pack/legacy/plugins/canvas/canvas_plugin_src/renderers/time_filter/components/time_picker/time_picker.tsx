/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import dateMath from '@elastic/datemath';
import { EuiButton } from '@elastic/eui';
import moment from 'moment';
import { DatetimeQuickList } from '../datetime_quick_list';
import { DatetimeRangeAbsolute } from '../datetime_range_absolute';
import { ComponentStrings } from '../../../../../i18n/components';

const { TimePicker: strings } = ComponentStrings;

export interface Props {
  /** Start date string */
  from: string;
  /** End date string */
  to: string;
  /** Function invoked when date range is changed */
  onSelect: (from: string, to: string) => void;
}

export interface State {
  range: {
    /** Start date string of selected date range */
    from: string;
    /** End date string of selected date range */
    to: string;
  };
  /** Boolean denoting whether selected date range has been applied */
  isDirty: boolean;
}

export class TimePicker extends Component<Props, State> {
  static propTypes = {
    from: PropTypes.string.isRequired,
    to: PropTypes.string.isRequired,
    onSelect: PropTypes.func.isRequired,
  };

  state = {
    range: { from: this.props.from, to: this.props.to },
    isDirty: false,
  };

  componentDidUpdate(prevProps: Props) {
    const { to, from } = this.props;

    if (prevProps.from !== from || prevProps.to !== to) {
      this.setState({
        range: { from, to },
        isDirty: false,
      });
    }
  }

  _absoluteSelect = (from?: moment.Moment, to?: moment.Moment) => {
    if (from && to) {
      this.setState({
        range: { from: moment(from).toISOString(), to: moment(to).toISOString() },
        isDirty: true,
      });
    }
  };

  render() {
    const { onSelect } = this.props;
    const { range, isDirty } = this.state;
    const { from, to } = range;

    return (
      <div className="canvasTimePicker">
        <DatetimeRangeAbsolute
          from={dateMath.parse(from)}
          to={dateMath.parse(to)}
          onSelect={this._absoluteSelect}
        />
        <DatetimeQuickList from={from} to={to} onSelect={onSelect}>
          <EuiButton
            fill
            size="s"
            disabled={!isDirty}
            className="canvasTimePicker__apply"
            onClick={() => {
              this.setState({ isDirty: false });
              onSelect(from, to);
            }}
          >
            {strings.getApplyButtonLabel()}
          </EuiButton>
        </DatetimeQuickList>
      </div>
    );
  }
}
