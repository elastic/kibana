/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';

import { EuiDatePicker } from '@elastic/eui';

import moment from 'moment';
import { FormattedMessage } from '@kbn/i18n/react';

const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

export class TimeRangeSelector extends Component {
  constructor(props) {
    super(props);

    this.state = {
      startTab: 0,
      endTab: 1,
    };
    this.latestTimestamp = this.props.startTime;
    this.now = this.props.now;
  }

  setStartTab = tab => {
    this.setState({ startTab: tab });
    switch (tab) {
      case 0:
        this.setStartTime(undefined);
        break;
      case 1:
        this.setStartTime(this.now);
        break;
      default:
        break;
    }
  };

  setEndTab = tab => {
    this.setState({ endTab: tab });
    switch (tab) {
      case 0:
        this.setEndTime(undefined);
        break;
      case 1:
        this.setEndTime(this.now);
        break;
      default:
        break;
    }
  };

  setStartTime = time => {
    this.props.setStartTime(time);
  };

  setEndTime = time => {
    this.props.setEndTime(time);
  };

  getTabItems() {
    const datePickerTimes = {
      start: moment.isMoment(this.props.startTime) ? this.props.startTime : this.latestTimestamp,
      end: moment.isMoment(this.props.endTime) ? this.props.endTime : this.now,
    };
    const formattedStartTime = this.latestTimestamp.format(TIME_FORMAT);

    // Show different labels for the start time depending on whether
    // the job has seen any data yet
    const showContinueLabels = this.latestTimestamp.valueOf() > 0;
    const startLabels =
      showContinueLabels === true
        ? [
            <FormattedMessage
              id="xpack.ml.jobsList.startDatafeedModal.continueFromStartTimeLabel"
              defaultMessage="Continue from {formattedStartTime}"
              values={{ formattedStartTime }}
            />,
            <FormattedMessage
              id="xpack.ml.jobsList.startDatafeedModal.continueFromNowLabel"
              defaultMessage="Continue from now"
            />,
            <FormattedMessage
              id="xpack.ml.jobsList.startDatafeedModal.continueFromSpecifiedTimeLabel"
              defaultMessage="Continue from specified time"
            />,
          ]
        : [
            <FormattedMessage
              id="xpack.ml.jobsList.startDatafeedModal.startAtBeginningOfDataLabel"
              defaultMessage="Start at beginning of data"
            />,
            <FormattedMessage
              id="xpack.ml.jobsList.startDatafeedModal.startFromNowLabel"
              defaultMessage="Start from now"
            />,
            <FormattedMessage
              id="xpack.ml.jobsList.startDatafeedModal.specifyStartTimeLabel"
              defaultMessage="Specify start time"
            />,
          ];

    const startItems = [
      { index: 0, label: startLabels[0] },
      { index: 1, label: startLabels[1] },
      {
        index: 2,
        label: startLabels[2],
        body: (
          <EuiDatePicker
            selected={datePickerTimes.start}
            onChange={this.setStartTime}
            maxDate={datePickerTimes.end}
            inline
            showTimeSelect
          />
        ),
      },
    ];
    const endItems = [
      {
        index: 0,
        label: (
          <FormattedMessage
            id="xpack.ml.jobsList.startDatafeedModal.noEndTimeLabel"
            defaultMessage="No end time (Real-time search)"
          />
        ),
      },
      {
        index: 1,
        label: (
          <FormattedMessage
            id="xpack.ml.jobsList.startDatafeedModal.specifyEndTimeLabel"
            defaultMessage="Specify end time"
          />
        ),
        body: (
          <EuiDatePicker
            selected={datePickerTimes.end}
            onChange={this.setEndTime}
            minDate={datePickerTimes.start}
            inline
            showTimeSelect
          />
        ),
      },
    ];
    return {
      startItems,
      endItems,
    };
  }

  render() {
    const { startItems, endItems } = this.getTabItems();
    return (
      <div className="time-range-selector">
        <div className="time-range-section-container">
          <TabStack
            title={
              <FormattedMessage
                id="xpack.ml.jobsList.startDatafeedModal.searchStartTimeTitle"
                defaultMessage="Search start time"
              />
            }
            items={startItems}
            switchState={this.state.startTab}
            switchFunc={this.setStartTab}
          />
          <TabStack
            title={
              <FormattedMessage
                id="xpack.ml.jobsList.startDatafeedModal.searchEndTimeTitle"
                defaultMessage="Search end time"
              />
            }
            items={endItems}
            switchState={this.state.endTab}
            switchFunc={this.setEndTab}
          />
        </div>
      </div>
    );
  }
}

function TabStack({ title, items, switchState, switchFunc }) {
  return (
    <div className="time-range-section">
      <div className="time-range-section-title">{title}</div>
      <ul className="tab-stack">
        {items.map((item, i) => {
          let className = '';
          if (switchState === item.index) {
            className += 'active ';
          }
          if (item.body !== undefined) {
            className += 'has-body ';
          }

          return (
            <li key={i} className={className}>
              <a onClick={() => switchFunc(item.index)} onKeyUp={() => {}}>
                {item.label}
              </a>
              {item.body !== undefined && <div className="body">{item.body}</div>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
TimeRangeSelector.propTypes = {
  startTime: PropTypes.object.isRequired,
  endTime: PropTypes.object,
  setStartTime: PropTypes.func.isRequired,
  setEndTime: PropTypes.func.isRequired,
};
