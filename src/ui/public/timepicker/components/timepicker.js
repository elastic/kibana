/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';

import { QuickSelectPopover } from './quick_select_popover';

import {
  EuiText,
  EuiFormControlLayout,
  EuiButtonIcon,
} from '@elastic/eui';

export class Timepicker extends Component {

  constructor(props) {
    super(props);

    this.state = {
      from: this.props.from,
      to: this.props.to,
    };
  }

  static getDerivedStateFromProps = (nextProps) => {
    return {
      from: nextProps.from,
      to: nextProps.to,
    };
  }

  setTime = ({ from, to }) => {
    this.setState({
      from,
      to,
    });
  }

  applyTimeChanges = () => {
    this.props.setTime(this.state.from, this.state.to);
  }

  render() {
    let applyButton;
    if (this.state.from !== this.props.from || this.state.to !== this.props.to) {
      applyButton = (
        <EuiButtonIcon
          size="s"
          onClick={this.applyTimeChanges}
          iconType="play"
          aria-label="Apply time changes"
        />
      );
    }
    return (
      <EuiFormControlLayout
        prepend={(
          <QuickSelectPopover
            setTime={this.setTime}
          />
        )}
        append={applyButton}
      >
        <div
          className="euiDatePickerRange"
        >
          {this.state.from}
          <EuiText className="euiDatePickerRange__delimeter" size="s" color="subdued">→</EuiText>
          {this.state.to}
        </div>
      </EuiFormControlLayout>
    );
  }
}

const timeType = PropTypes.oneOfType([
  PropTypes.string,
  PropTypes.object,
]);

Timepicker.propTypes = {
  from: timeType,
  to: timeType,
  setTime: PropTypes.func.isRequired,
};
