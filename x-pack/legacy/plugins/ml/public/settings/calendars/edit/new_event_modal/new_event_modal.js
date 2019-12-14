/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { PropTypes } from 'prop-types';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiDatePicker,
  EuiDatePickerRange,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import moment from 'moment';
import { TIME_FORMAT } from '../events_table/';
import { generateTempId } from '../utils';

import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

const VALID_DATE_STRING_LENGTH = 19;

export const NewEventModal = injectI18n(
  class NewEventModal extends Component {
    static propTypes = {
      closeModal: PropTypes.func.isRequired,
      addEvent: PropTypes.func.isRequired,
    };

    constructor(props) {
      super(props);

      const startDate = moment().startOf('day');
      const endDate = moment()
        .startOf('day')
        .add(1, 'days');

      this.state = {
        startDate,
        endDate,
        description: '',
        startDateString: startDate.format(TIME_FORMAT),
        endDateString: endDate.format(TIME_FORMAT),
      };
    }

    onDescriptionChange = e => {
      this.setState({
        description: e.target.value,
      });
    };

    handleAddEvent = () => {
      const { description, startDate, endDate } = this.state;
      // Temp reference to unsaved events to allow removal from table
      const tempId = generateTempId();

      const event = {
        description,
        start_time: startDate.valueOf(),
        end_time: endDate.valueOf(),
        event_id: tempId,
      };

      this.props.addEvent(event);
    };

    handleChangeStart = date => {
      let start = null;
      let end = this.state.endDate;

      const startMoment = moment(date);
      const endMoment = moment(date);

      start = startMoment.startOf('day');

      if (start > end) {
        end = endMoment.startOf('day').add(1, 'days');
      }
      this.setState({
        startDate: start,
        endDate: end,
        startDateString: start.format(TIME_FORMAT),
        endDateString: end.format(TIME_FORMAT),
      });
    };

    handleChangeEnd = date => {
      let start = this.state.startDate;
      let end = null;

      const startMoment = moment(date);
      const endMoment = moment(date);

      end = endMoment.startOf('day');

      if (start > end) {
        start = startMoment.startOf('day').subtract(1, 'days');
      }
      this.setState({
        startDate: start,
        endDate: end,
        startDateString: start.format(TIME_FORMAT),
        endDateString: end.format(TIME_FORMAT),
      });
    };

    handleTimeStartChange = event => {
      const dateString = event.target.value;
      let isValidDate = false;

      if (dateString.length === VALID_DATE_STRING_LENGTH) {
        isValidDate = moment(dateString).isValid(TIME_FORMAT, true);
      } else {
        this.setState({
          startDateString: dateString,
        });
      }

      if (isValidDate) {
        this.setState({
          startDateString: dateString,
          startDate: moment(dateString),
        });
      }
    };

    handleTimeEndChange = event => {
      const dateString = event.target.value;
      let isValidDate = false;

      if (dateString.length === VALID_DATE_STRING_LENGTH) {
        isValidDate = moment(dateString).isValid(TIME_FORMAT, true);
      } else {
        this.setState({
          endDateString: dateString,
        });
      }

      if (isValidDate) {
        this.setState({
          endDateString: dateString,
          endDate: moment(dateString),
        });
      }
    };

    renderRangedDatePicker = () => {
      const { startDate, endDate, startDateString, endDateString } = this.state;

      const { intl } = this.props;

      const timeInputs = (
        <Fragment>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFormRow
                label={
                  <FormattedMessage
                    id="xpack.ml.calendarsEdit.newEventModal.fromLabel"
                    defaultMessage="From:"
                  />
                }
                helpText={TIME_FORMAT}
              >
                <EuiFieldText
                  name="startTime"
                  onChange={this.handleTimeStartChange}
                  placeholder={TIME_FORMAT}
                  value={startDateString}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow
                label={
                  <FormattedMessage
                    id="xpack.ml.calendarsEdit.newEventModal.toLabel"
                    defaultMessage="To:"
                  />
                }
                helpText={TIME_FORMAT}
              >
                <EuiFieldText
                  name="endTime"
                  onChange={this.handleTimeEndChange}
                  placeholder={TIME_FORMAT}
                  value={endDateString}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </Fragment>
      );

      return (
        <Fragment>
          <EuiSpacer size="s" />
          {timeInputs}
          <EuiSpacer size="s" />
          <EuiFormRow fullWidth>
            <EuiDatePickerRange
              fullWidth
              iconType={false}
              startDateControl={
                <EuiDatePicker
                  fullWidth
                  inline
                  selected={startDate}
                  onChange={this.handleChangeStart}
                  startDate={startDate}
                  endDate={endDate}
                  isInvalid={startDate > endDate}
                  aria-label={intl.formatMessage({
                    id: 'xpack.ml.calendarsEdit.newEventModal.startDateAriaLabel',
                    defaultMessage: 'Start date',
                  })}
                  timeFormat={TIME_FORMAT}
                  dateFormat={TIME_FORMAT}
                />
              }
              endDateControl={
                <EuiDatePicker
                  fullWidth
                  inline
                  selected={endDate}
                  onChange={this.handleChangeEnd}
                  startDate={startDate}
                  endDate={endDate}
                  isInvalid={startDate > endDate}
                  aria-label={intl.formatMessage({
                    id: 'xpack.ml.calendarsEdit.newEventModal.endDateAriaLabel',
                    defaultMessage: 'End date',
                  })}
                  timeFormat={TIME_FORMAT}
                  dateFormat={TIME_FORMAT}
                />
              }
            />
          </EuiFormRow>
        </Fragment>
      );
    };

    render() {
      const { closeModal } = this.props;
      const { description } = this.state;

      return (
        <Fragment>
          <EuiModal onClose={closeModal} initialFocus="[name=eventDescription]" maxWidth={false}>
            <EuiModalHeader>
              <EuiModalHeaderTitle>
                <FormattedMessage
                  id="xpack.ml.calendarsEdit.newEventModal.createNewEventTitle"
                  defaultMessage="Create new event"
                />
              </EuiModalHeaderTitle>
            </EuiModalHeader>

            <EuiModalBody>
              <EuiForm>
                <EuiFormRow
                  label={
                    <FormattedMessage
                      id="xpack.ml.calendarsEdit.newEventModal.descriptionLabel"
                      defaultMessage="Description"
                    />
                  }
                  fullWidth
                >
                  <EuiFieldText
                    name="eventDescription"
                    onChange={this.onDescriptionChange}
                    isInvalid={!description}
                    fullWidth
                  />
                </EuiFormRow>

                <EuiSpacer size="m" />

                {this.renderRangedDatePicker()}
              </EuiForm>
            </EuiModalBody>

            <EuiModalFooter>
              <EuiButtonEmpty onClick={closeModal}>
                <FormattedMessage
                  id="xpack.ml.calendarsEdit.newEventModal.cancelButtonLabel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
              <EuiButton onClick={this.handleAddEvent} fill disabled={!description}>
                <FormattedMessage
                  id="xpack.ml.calendarsEdit.newEventModal.addButtonLabel"
                  defaultMessage="Add"
                />
              </EuiButton>
            </EuiModalFooter>
          </EuiModal>
        </Fragment>
      );
    }
  }
);
