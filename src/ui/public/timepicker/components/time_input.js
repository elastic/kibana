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

import chrome from 'ui/chrome';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { AbsoluteForm } from './absolute_form';
import { RelativeForm } from './relative_form';

import {
  EuiPopover,
  EuiTabbedContent,
} from '@elastic/eui';

import { formatTimeString } from '../pretty_duration';
import {
  getTimeMode,
  TIME_MODES,
  toAbsoluteString,
  toRelativeString,
} from '../lib/time_modes';

export class TimeInput extends Component {

  constructor(props) {
    super(props);

    this.state = {
      isOpen: false,
    };
  }

  onTabClick = (selectedTab) => {
    const {
      value,
      roundUp
    } = this.props;

    switch(selectedTab.id) {
      case TIME_MODES.ABSOLUTE:
        this.props.onChange(toAbsoluteString(value, roundUp));
        break;
      case TIME_MODES.RELATIVE:
        this.props.onChange(toRelativeString(value));
        break;
      case TIME_MODES.NOW:
        this.props.onChange('now');
        break;
    }
    this.setState({ selectedTab });
  };

  closePopover = () => {
    this.setState({ isOpen: false });
  }

  togglePopover = () => {
    const timeMode = getTimeMode(this.props.value);
    this.setState((prevState) => ({
      isOpen: !prevState.isOpen,
      selectedTab: this.renderTabs().find(tab => {
        return tab.id === timeMode;
      }),
    }));
  }

  renderTabs = () => {
    return [
      {
        id: TIME_MODES.ABSOLUTE,
        name: 'Absolute',
        content: (
          <AbsoluteForm
            value={this.props.value}
            onChange={this.props.onChange}
            roundUp={this.props.roundUp}
          />
        ),
      },
      {
        id: TIME_MODES.RELATIVE,
        name: 'Relative',
        content: (
          <RelativeForm
            dateFormat={chrome.getUiSettingsClient().get('dateFormat')}
            value={this.props.value}
            onChange={this.props.onChange}
            roundUp={this.props.roundUp}
          />
        ),
      },
      {
        id: TIME_MODES.NOW,
        name: 'Now',
        content: (
          <div>
            now time stuff goes here
          </div>
        ),
      }
    ];
  }

  render() {
    const input = (
      <span
        onClick={this.togglePopover}
      >
        {formatTimeString(this.props.value, chrome.getUiSettingsClient().get('dateFormat'))}
      </span>
    );

    return (
      <EuiPopover
        button={input}
        isOpen={this.state.isOpen}
        closePopover={this.closePopover}
        anchorPosition="downRight"
        ownFocus
        panelPaddingSize="none"
      >
        <EuiTabbedContent
          tabs={this.renderTabs()}
          selectedTab={this.state.selectedTab}
          onTabClick={this.onTabClick}
          expand
        />
      </EuiPopover>
    );
  }
}

TimeInput.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  roundUp: PropTypes.bool,
};

TimeInput.defaultProps = {
  roundUp: false,
};
