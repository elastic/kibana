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

import { timeUnits } from '../time_units';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiFieldNumber,
  EuiButtonIcon,
  EuiButton,
} from '@elastic/eui';

const refreshUnitsOptions = Object.keys(timeUnits)
  .map(key => {
    return { value: key, text: `${timeUnits[key]}s` };
  })
  .filter(option => {
    return option.value === 'h' || option.value === 'm';
  });

const MILLISECONDS_IN_MINUTE = 1000 * 60;
const MILLISECONDS_IN_HOUR = MILLISECONDS_IN_MINUTE * 60;

function convertMilliseconds(milliseconds) {
  if (milliseconds > MILLISECONDS_IN_HOUR) {
    return {
      units: 'h',
      value: milliseconds / MILLISECONDS_IN_HOUR
    };
  }

  return {
    units: 'm',
    value: milliseconds / MILLISECONDS_IN_MINUTE
  };
}

export class RefreshIntervalForm extends Component {

  constructor(props) {
    super(props);

    const { value, units } = convertMilliseconds(this.props.refreshInterval);
    this.state = {
      value,
      units,
    };
  }

  static getDerivedStateFromProps = (nextProps) => {
    const { value, units } = convertMilliseconds(nextProps.refreshInterval);
    return {
      value,
      units,
    };
  }

  toogleRefresh = () => {
    this.props.setRefresh({
      pause: !this.props.isPaused
    });
  }

  onValueChange = (evt) => {
    const sanitizedValue = parseInt(evt.target.value, 10);
    this.setState({
      value: isNaN(sanitizedValue) ? 0 : sanitizedValue,
    });
  };

  onUnitsChange = (evt) => {
    this.setState({
      units: evt.target.value,
    });
  }

  setRefresh = () => {
    let value;
    if (this.state.units === 'h') {
      value = this.state.value * MILLISECONDS_IN_HOUR;
    } else {
      value = this.state.value * MILLISECONDS_IN_MINUTE;
    }
    this.props.setRefresh({
      value,
    });
  }

  render() {
    if (!this.props.setRefresh) {
      return;
    }

    return (
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiFormRow>
            <EuiButtonIcon
              onClick={this.toogleRefresh}
              iconType={this.props.isPaused ? 'play' : 'pause'}
              aria-label="Toogle refresh"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow>
            <EuiFieldNumber
              value={this.state.value}
              onChange={this.onValueChange}
              aria-label="Refresh interval value"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow>
            <EuiSelect
              aria-label="Refresh interval units"
              value={this.state.units}
              options={refreshUnitsOptions}
              onChange={this.onUnitsChange}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow>
            <EuiButton
              onClick={this.setRefresh}
              style={{ minWidth: 0 }}
              disabled={this.state.value === ''}
            >
              Apply
            </EuiButton>
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}

RefreshIntervalForm.propTypes = {
  setRefresh: PropTypes.func,
  isPaused: PropTypes.bool,
  refreshInterval: PropTypes.number,
};

RefreshIntervalForm.defaultProps = {
  isPaused: true,
  refreshInterval: 0,
};

