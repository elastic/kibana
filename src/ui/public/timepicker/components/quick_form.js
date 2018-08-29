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

import _ from 'lodash';
import chrome from 'ui/chrome';
import PropTypes from 'prop-types';
import React, { Component, Fragment } from 'react';

import { timeUnits } from '../time_units';
import { timeHistory } from '../../timefilter/time_history';
import { prettyDuration } from '../pretty_duration';

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
  EuiLink,
  EuiButtonIcon,
} from '@elastic/eui';

const LAST = 'last';
const NEXT = 'next';

const timeTenseOptions = [
  { value: LAST, text: 'Last' },
  { value: NEXT, text: 'Next' },
];
const timeUnitsOptions = Object.keys(timeUnits).map(key => {
  return { value: key, text: `${timeUnits[key]}s` };
});

export class QuickForm extends Component {

  state = {
    isOpen: false,
    timeTense: LAST,
    timeValue: 15,
    timeUnits: 'm',
  }

  closePopover = () => {
    this.setState({ isOpen: false });
  }

  togglePopover = () => {
    this.setState((prevState) => ({
      isOpen: !prevState.isOpen
    }));
  }

  onTimeTenseChange = (evt) => {
    this.setState({
      timeTense: evt.target.value,
    });
  }

  onTimeValueChange = (evt) => {
    const sanitizedValue = parseInt(evt.target.value, 10);
    this.setState({
      timeValue: isNaN(sanitizedValue) ? '' : sanitizedValue,
    });
  }

  onTimeUnitsChange = (evt) => {
    this.setState({
      timeUnits: evt.target.value,
    });
  }

  applyQuickSelect = () => {
    const {
      timeTense,
      timeValue,
      timeUnits,
    } = this.state;

    if (timeTense === NEXT) {
      this.setTime({
        from: 'now',
        to: `now+${timeValue}${timeUnits}`
      });
      return;
    }

    this.setTime({
      from: `now-${timeValue}${timeUnits}`,
      to: 'now'
    });
  }



  setTime = ({ from, to }) => {
    this.props.setTime({
      from: from,
      to: to
    });
    this.closePopover();
  }

  applyTime = ({ from, to }) => {
    this.props.applyTime({
      from: from,
      to: to
    });
    this.closePopover();
  }

  renderTimeNavigation = () => {
    return (
      <Fragment>
        <EuiButtonIcon
          onClick={this.props.stepBackward}
          iconType="arrowLeft"
          aria-label="Move backward in time"
        />
        <EuiButtonIcon
          onClick={this.props.stepForward}
          iconType="arrowRight"
          aria-label="Move forward in time"
        />
      </Fragment>
    );
  }

  renderQuickSelect = () => {
    return (
      <Fragment>
        <EuiTitle size="xxxs"><span>Quick select</span></EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiFormRow>
              <EuiSelect
                aria-label="Quick time tense"
                value={this.state.timeTense}
                options={timeTenseOptions}
                onChange={this.onTimeTenseChange}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow>
              <EuiFieldNumber
                aria-label="Quick time value"
                value={this.state.timeValue}
                onChange={this.onTimeValueChange}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow>
              <EuiSelect
                aria-label="Quick time units"
                value={this.state.timeUnits}
                options={timeUnitsOptions}
                onChange={this.onTimeUnitsChange}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow>
              <EuiButton
                onClick={this.applyQuickSelect}
                style={{ minWidth: 0 }}
                disabled={this.state.timeValue === ''}
              >
                Apply
              </EuiButton>
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </Fragment>
    );
  }

  renderCommonlyUsed = () => {
    const commonlyUsed = chrome.getUiSettingsClient().get('timepicker:quickRanges');
    const sections = _.groupBy(commonlyUsed, 'section');

    const renderSectionItems = (section) => {
      return section.map(({ from, to, display }) => {
        const applyTime = () => {
          this.applyTime({ from, to });
        };
        return (
          <EuiFlexItem key={display}>
            <EuiLink onClick={applyTime}>{display}</EuiLink>
          </EuiFlexItem>
        );
      });
    };

    return (
      <Fragment>
        <EuiTitle size="xxxs"><span>Commonly used</span></EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">
          {Object.keys(sections).map((key, index) => {
            const isLastSection = Object.keys(sections).length - 1 === index;
            const sectionSpacer = isLastSection
              ? undefined
              : (<EuiSpacer size="m" />);
            return (
              <Fragment key={key}>
                <EuiFlexGrid
                  gutterSize="s"
                  columns={2}
                  responsive={false}
                >
                  {renderSectionItems(sections[key])}
                </EuiFlexGrid>
                {sectionSpacer}
              </Fragment>
            );
          })}
        </EuiText>
      </Fragment>
    );
  }

  renderRecentlyUsed = () => {
    const links = timeHistory.get().map(({ from, to }) => {
      const applyTime = () => {
        this.applyTime({ from, to });
      };
      const display = prettyDuration(from, to, (...args) => chrome.getUiSettingsClient().get(...args));
      return (
        <EuiFlexItem key={display}>
          <EuiLink onClick={applyTime}>{display}</EuiLink>
        </EuiFlexItem>
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
          {this.renderTimeNavigation()}
          <EuiHorizontalRule />
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

QuickForm.propTypes = {
  applyTime: PropTypes.func.isRequired,
  setTime: PropTypes.func.isRequired,
  stepForward: PropTypes.func.isRequired,
  stepBackward: PropTypes.func.isRequired,
};
