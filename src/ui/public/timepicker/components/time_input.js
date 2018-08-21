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

import { AbsoluteForm } from './absolute_form';

import {
  EuiPopover,
  EuiFieldText,
  EuiTabbedContent,
} from '@elastic/eui';

export class TimeInput extends Component {

  constructor(props) {
    super(props);

    this.tabs = [
      {
        id: 'absolute',
        name: 'Absolute',
        content: (
          <AbsoluteForm
            value={this.props.value}
            onChange={this.props.onChange}
          />
        ),
      },
      {
        id: 'relative',
        name: 'Relative',
        content: (
          <div>
            Relative time stuff goes here
          </div>
        ),
      },
      {
        id: 'now',
        name: 'Now',
        content: (
          <div>
            now time stuff goes here
          </div>
        ),
      }
    ];

    this.state = {
      isOpen: false,
      selectedTab: this.tabs[0],
    };
  }

  onTabClick = (selectedTab) => {
    this.setState({ selectedTab });
  };

  closePopover = () => {
    this.setState({ isOpen: false });
  }

  togglePopover = () => {
    this.setState((prevState) => ({
      isOpen: !prevState.isOpen
    }));
  }

  render() {

    const input = (
      <EuiFieldText
        value={this.props.value}
        readOnly
        onClick={this.togglePopover}
      />
    );

    return (
      <EuiPopover
        button={input}
        isOpen={this.state.isOpen}
        closePopover={this.closePopover}
        anchorPosition="downRight"
        ownFocus
      >
        <EuiTabbedContent
          tabs={this.tabs}
          selectedTab={this.state.selectedTab}
          onTabClick={this.onTabClick}
          expand
        />
      </EuiPopover>
    );
  }
}

TimeInput.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};

TimeInput.defaultProps = {
  value: ''
};
