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
import dateMath from '@kbn/datemath';

import {
  EuiForm,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldNumber,
  EuiSelect,
  EuiDatePicker,
  EuiSwitch,
} from '@elastic/eui';

import { timeUnits } from '../time_units';
import { parseRelativeString } from '../parse_relative_parts';
import { relativeOptions } from '../relative_options';
import { toRelativeStringFromParts } from '../lib/time_modes';

export class RelativeForm extends Component {

  constructor(props) {
    super(props);

    this.state = {
      ...parseRelativeString(this.props.value)
    };
  }

  static getDerivedStateFromProps = (nextProps) => {
    return {
      ...parseRelativeString(nextProps.value)
    };
  }

  onCountChange = (evt) => {
    const sanitizedValue = parseInt(evt.target.value, 10);
    this.setState({
      count: isNaN(sanitizedValue) ? '' : sanitizedValue,
    }, this.handleChange);
  }

  onUnitChange = (evt) => {
    this.setState({
      unit: evt.target.value,
    }, this.handleChange);
  }

  onRoundChange = (evt) => {
    this.setState({
      round: evt.target.checked,
    }, this.handleChange);
  };

  handleChange = () => {
    const {
      count,
      unit,
      round,
    } = this.state;
    this.props.onChange(toRelativeStringFromParts({ count, unit, round }));
  }

  render() {
    return (
      <EuiForm style={{ width: 390, padding: 16 }}>
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiFormRow>
              <EuiFieldNumber
                aria-label="Count of"
                value={this.state.count}
                onChange={this.onCountChange}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow>
              <EuiSelect
                value={this.state.unit}
                options={relativeOptions}
                onChange={this.onUnitChange}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFormRow>
          <EuiDatePicker
            selected={dateMath.parse(this.props.value)}
            dateFormat={this.props.dateFormat}
            disabled
          />
        </EuiFormRow>
        <EuiFormRow>
          <EuiSwitch
            label={`Round to the ${timeUnits[this.state.unit]}`}
            checked={this.state.round}
            onChange={this.onRoundChange}
          />
        </EuiFormRow>
      </EuiForm>
    );
  }
}

RelativeForm.propTypes = {
  dateFormat: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  roundUp: PropTypes.bool,
};
