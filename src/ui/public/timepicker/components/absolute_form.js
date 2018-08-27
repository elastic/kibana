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
import React, { Component, Fragment } from 'react';

import moment from 'moment';

import dateMath from '@kbn/datemath';

import {
  EuiDatePicker,
  EuiFieldText,
  EuiFormRow,
} from '@elastic/eui';

const INPUT_DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss.SSS';

const toMoment = (value, roundUp) => {
  const valueAsMoment = dateMath.parse(value, { roundUp });
  return {
    value: valueAsMoment,
    textInputValue: valueAsMoment.format(INPUT_DATE_FORMAT)
  };
};

export class AbsoluteForm extends Component {

  constructor(props) {
    super(props);

    this.state = {
      ...toMoment(this.props.value, this.props.roundUp),
      isTextInvalid: false,
    };
  }

  static getDerivedStateFromProps = (nextProps) => {
    return {
      ...toMoment(nextProps.value, nextProps.roundUp),
      isTextInvalid: false,
    };
  }

  handleChange = (date) => {
    this.props.onChange(date.toISOString());
  }

  handleTextChange = (evt) => {
    const date = moment(evt.target.value, INPUT_DATE_FORMAT, true);
    if (date.isValid()) {
      this.props.onChange(date.toISOString());
    }

    this.setState({
      textInputValue: evt.target.value,
      isTextInvalid: !date.isValid()
    });
  }

  render() {
    return (
      <Fragment>
        <EuiFormRow
          isInvalid={this.state.isTextInvalid}
          error={this.state.isTextInvalid ? `Expected format ${INPUT_DATE_FORMAT}` : undefined}
        >
          <EuiFieldText
            isInvalid={this.state.isTextInvalid}
            value={this.state.textInputValue}
            onChange={this.handleTextChange}
          />
        </EuiFormRow>
        <EuiDatePicker
          selected={this.state.value}
          onChange={this.handleChange}
          inline
          showTimeSelect
          shadow={false}
        />
      </Fragment>
    );
  }
}

AbsoluteForm.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  roundUp: PropTypes.bool.isRequired,
};
