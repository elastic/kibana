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

import moment from 'moment';

import dateMath from '@kbn/datemath';

import {
  EuiDatePicker,
} from '@elastic/eui';

const toMoment = (value, roundUp) => {
  return dateMath.parse(value, { roundUp });
};

export class AbsoluteForm extends Component {

  constructor(props) {
    super(props);

    this.state = {
      value: toMoment(this.props.value, this.props.roundUp),
    };
  }

  static getDerivedStateFromProps = (nextProps) => {
    return {
      value: toMoment(nextProps.value, nextProps.roundUp),
    };
  }

  handleChange = (date) => {
    this.props.onChange(date.toISOString());
  }

  render() {
    return (
      <EuiDatePicker
        selected={this.state.value}
        onChange={this.handleChange}
        inline
        showTimeSelect
        shadow={false}
      />
    );
  }
}

AbsoluteForm.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  roundUp: PropTypes.bool.isRequired,
};
