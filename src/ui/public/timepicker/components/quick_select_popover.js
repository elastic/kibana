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

import {
  EuiButtonEmpty,
  EuiIcon,
  EuiPopover,
  EuiTitle,
  EuiSpacer,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiFieldNumber,
  EuiButton,
  EuiText,
  EuiHorizontalRule,
} from '@elastic/eui';

export class QuickSelectPopover extends Component {

  state = {
    isOpen: false
  }

  closePopover = () => {
    this.setState({ isOpen: false });
  }

  togglePopover = () => {
    this.setState((prevState) => ({
      isOpen: !prevState.isOpen
    }));
  }

  renderQuickSelect = () => {
    const firstOptions = [
      { value: 'last', text: 'Last' },
      { value: 'previous', text: 'Previous' },
    ];

    const lastOptions = [
      { value: 'seconds', text: 'seconds' },
      { value: 'minutes', text: 'minutes' },
      { value: 'hours', text: 'hours' },
      { value: 'days', text: 'days' },
      { value: 'weeks', text: 'weeks' },
      { value: 'months', text: 'months' },
      { value: 'years', text: 'years' },
    ];

    return (
      <Fragment>
        <EuiTitle size="xxxs"><span>Quick select</span></EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiFormRow>
              <EuiSelect options={firstOptions} />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow>
              <EuiFieldNumber aria-label="Count of" defaultValue="256" />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow>
              <EuiSelect options={lastOptions} />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow>
              <EuiButton onClick={this.closePopover} style={{ minWidth: 0 }}>Apply</EuiButton>
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </Fragment>
    );
  }

  renderCommonlyUsed = (commonDates) => {
    const links = [].map((date) => {
      return (
        <EuiFlexItem key={date}><EuiLink onClick={this.closePopover}>{date}</EuiLink></EuiFlexItem>
      );
    });

    return (
      <Fragment>
        <EuiTitle size="xxxs"><span>Commonly used</span></EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <EuiFlexGrid gutterSize="s" columns={2} responsive={false}>
            {links}
          </EuiFlexGrid>
        </EuiText>
      </Fragment>
    );
  }

  renderRecentlyUsed = () => {
    const links = [].map((date) => {
      let dateRange;
      if (typeof date !== 'string') {
        dateRange = `${date[0]} – ${date[1]}`;
      }

      return (
        <EuiFlexItem grow={false} key={date}><EuiLink onClick={this.closePopover}>{dateRange || date}</EuiLink></EuiFlexItem>
      );
    });

    return (
      <Fragment>
        <EuiTitle size="xxxs"><span>Recently used date ranges</span></EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <EuiFlexGroup gutterSize="s" direction="column">
            {links}
          </EuiFlexGroup>
        </EuiText>
      </Fragment>
    );
  }

  render() {

    const quickSelectButton = (
      <EuiButtonEmpty
        className="euiFormControlLayout__prepend"
        style={{ borderRight: 'none' }}
        onClick={this.togglePopover}
        aria-label="Timepicker quick select"
        size="xs"
        iconType="arrowDown"
        iconSide="right"
      >
        <EuiIcon type="calendar" />
      </EuiButtonEmpty>
    );

    return (
      <EuiPopover
        id="QuickSelectPopover"
        button={quickSelectButton}
        isOpen={this.state.isOpen}
        closePopover={this.closePopover}
        anchorPosition="downLeft"
        ownFocus
      >
        <div style={{ width: '400px' }}>
          {this.renderQuickSelect()}
          <EuiHorizontalRule />
          {this.renderCommonlyUsed()}
          <EuiHorizontalRule />
          {this.renderRecentlyUsed()}
        </div>
      </EuiPopover>
    );
  }
}

QuickSelectPopover.propTypes = {

}
