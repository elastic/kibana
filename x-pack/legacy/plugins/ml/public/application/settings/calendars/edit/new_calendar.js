/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { PropTypes } from 'prop-types';

import { injectI18n } from '@kbn/i18n/react';

import { EuiPage, EuiPageContent, EuiOverlayMask } from '@elastic/eui';

import { toastNotifications } from 'ui/notify';

import { NavigationMenu } from '../../../components/navigation_menu';

import { getCalendarSettingsData, validateCalendarId } from './utils';
import { CalendarForm } from './calendar_form';
import { NewEventModal } from './new_event_modal';
import { ImportModal } from './import_modal';
import { ml } from '../../../services/ml_api_service';

export const NewCalendar = injectI18n(
  class NewCalendar extends Component {
    static propTypes = {
      calendarId: PropTypes.string,
      canCreateCalendar: PropTypes.bool.isRequired,
      canDeleteCalendar: PropTypes.bool.isRequired,
    };

    constructor(props) {
      super(props);
      this.state = {
        isNewEventModalVisible: false,
        isImportModalVisible: false,
        isNewCalendarIdValid: null,
        loading: true,
        jobIds: [],
        jobIdOptions: [],
        groupIds: [],
        groupIdOptions: [],
        calendars: [],
        formCalendarId: '',
        description: '',
        selectedJobOptions: [],
        selectedGroupOptions: [],
        events: [],
        saving: false,
        selectedCalendar: undefined,
      };
    }

    componentDidMount() {
      this.formSetup();
    }

    async formSetup() {
      try {
        const { jobIds, groupIds, calendars } = await getCalendarSettingsData();

        const jobIdOptions = jobIds.map(jobId => ({ label: jobId }));
        const groupIdOptions = groupIds.map(groupId => ({ label: groupId }));

        const selectedJobOptions = [];
        const selectedGroupOptions = [];
        let eventsList = [];
        let selectedCalendar;
        let formCalendarId = '';

        // Editing existing calendar.
        if (this.props.calendarId !== undefined) {
          selectedCalendar = calendars.find(cal => cal.calendar_id === this.props.calendarId);

          if (selectedCalendar) {
            formCalendarId = selectedCalendar.calendar_id;
            eventsList = selectedCalendar.events;

            selectedCalendar.job_ids.forEach(id => {
              if (jobIds.find(jobId => jobId === id)) {
                selectedJobOptions.push({ label: id });
              } else if (groupIds.find(groupId => groupId === id)) {
                selectedGroupOptions.push({ label: id });
              }
            });
          }
        }

        this.setState({
          events: eventsList,
          formCalendarId,
          jobIds,
          jobIdOptions,
          groupIds,
          groupIdOptions,
          calendars,
          loading: false,
          selectedJobOptions,
          selectedGroupOptions,
          selectedCalendar,
        });
      } catch (error) {
        console.log(error);
        this.setState({ loading: false });
        toastNotifications.addDanger(
          this.props.intl.formatMessage({
            id: 'xpack.ml.calendarsEdit.errorWithLoadingCalendarFromDataErrorMessage',
            defaultMessage:
              'An error occurred loading calendar form data. Try refreshing the page.',
          })
        );
      }
    }

    isDuplicateId = () => {
      const { calendars, formCalendarId } = this.state;

      for (let i = 0; i < calendars.length; i++) {
        if (calendars[i].calendar_id === formCalendarId) {
          return true;
        }
      }

      return false;
    };

    onCreate = async () => {
      const { formCalendarId } = this.state;
      const { intl } = this.props;

      if (this.isDuplicateId()) {
        toastNotifications.addDanger(
          intl.formatMessage(
            {
              id: 'xpack.ml.calendarsEdit.canNotCreateCalendarWithExistingIdErrorMessag',
              defaultMessage:
                'Cannot create calendar with id [{formCalendarId}] as it already exists.',
            },
            { formCalendarId }
          )
        );
      } else {
        const calendar = this.setUpCalendarForApi();
        this.setState({ saving: true });

        try {
          await ml.addCalendar(calendar);
          window.location = '#/settings/calendars_list';
        } catch (error) {
          console.log('Error saving calendar', error);
          this.setState({ saving: false });
          toastNotifications.addDanger(
            intl.formatMessage(
              {
                id: 'xpack.ml.calendarsEdit.errorWithCreatingCalendarErrorMessage',
                defaultMessage: 'An error occurred creating calendar {calendarId}',
              },
              { calendarId: calendar.calendarId }
            )
          );
        }
      }
    };

    onEdit = async () => {
      const calendar = this.setUpCalendarForApi();
      this.setState({ saving: true });

      try {
        await ml.updateCalendar(calendar);
        window.location = '#/settings/calendars_list';
      } catch (error) {
        console.log('Error saving calendar', error);
        this.setState({ saving: false });
        toastNotifications.addDanger(
          this.props.intl.formatMessage(
            {
              id: 'xpack.ml.calendarsEdit.errorWithUpdatingCalendarErrorMessage',
              defaultMessage:
                'An error occurred saving calendar {calendarId}. Try refreshing the page.',
            },
            { calendarId: calendar.calendarId }
          )
        );
      }
    };

    setUpCalendarForApi = () => {
      const {
        formCalendarId,
        description,
        events,
        selectedGroupOptions,
        selectedJobOptions,
      } = this.state;

      const jobIds = selectedJobOptions.map(option => option.label);
      const groupIds = selectedGroupOptions.map(option => option.label);

      // Reduce events to fields expected by api
      const eventsToSave = events.map(event => ({
        description: event.description,
        start_time: event.start_time,
        end_time: event.end_time,
      }));

      // set up calendar
      const calendar = {
        calendarId: formCalendarId,
        description,
        events: eventsToSave,
        job_ids: [...jobIds, ...groupIds],
      };

      return calendar;
    };

    onCreateGroupOption = newGroup => {
      const newOption = {
        label: newGroup,
      };
      // Select the option.
      this.setState(prevState => ({
        selectedGroupOptions: prevState.selectedGroupOptions.concat(newOption),
      }));
    };

    onJobSelection = selectedJobOptions => {
      this.setState({
        selectedJobOptions,
      });
    };

    onGroupSelection = selectedGroupOptions => {
      this.setState({
        selectedGroupOptions,
      });
    };

    onCalendarIdChange = e => {
      const isValid = validateCalendarId(e.target.value);

      this.setState({
        formCalendarId: e.target.value,
        isNewCalendarIdValid: isValid,
      });
    };

    onDescriptionChange = e => {
      this.setState({
        description: e.target.value,
      });
    };

    showImportModal = () => {
      this.setState(prevState => ({
        isImportModalVisible: !prevState.isImportModalVisible,
      }));
    };

    closeImportModal = () => {
      this.setState({
        isImportModalVisible: false,
      });
    };

    onEventDelete = eventId => {
      this.setState(prevState => ({
        events: prevState.events.filter(event => event.event_id !== eventId),
      }));
    };

    closeNewEventModal = () => {
      this.setState({ isNewEventModalVisible: false });
    };

    showNewEventModal = () => {
      this.setState({ isNewEventModalVisible: true });
    };

    addEvent = event => {
      this.setState(prevState => ({
        events: [...prevState.events, event],
        isNewEventModalVisible: false,
      }));
    };

    addImportedEvents = events => {
      this.setState(prevState => ({
        events: [...prevState.events, ...events],
        isImportModalVisible: false,
      }));
    };

    render() {
      const {
        events,
        isNewEventModalVisible,
        isImportModalVisible,
        isNewCalendarIdValid,
        formCalendarId,
        description,
        groupIdOptions,
        jobIdOptions,
        saving,
        selectedCalendar,
        selectedJobOptions,
        selectedGroupOptions,
      } = this.state;

      let modal = '';

      if (isNewEventModalVisible) {
        modal = (
          <EuiOverlayMask>
            <NewEventModal addEvent={this.addEvent} closeModal={this.closeNewEventModal} />
          </EuiOverlayMask>
        );
      } else if (isImportModalVisible) {
        modal = (
          <EuiOverlayMask>
            <ImportModal
              addImportedEvents={this.addImportedEvents}
              closeImportModal={this.closeImportModal}
            />
          </EuiOverlayMask>
        );
      }

      return (
        <Fragment>
          <NavigationMenu tabId="settings" />
          <EuiPage className="mlCalendarEditForm">
            <EuiPageContent
              className="mlCalendarEditForm__content"
              verticalPosition="center"
              horizontalPosition="center"
            >
              <CalendarForm
                calendarId={selectedCalendar ? selectedCalendar.calendar_id : formCalendarId}
                canCreateCalendar={this.props.canCreateCalendar}
                canDeleteCalendar={this.props.canDeleteCalendar}
                description={selectedCalendar ? selectedCalendar.description : description}
                eventsList={events}
                groupIds={groupIdOptions}
                isEdit={selectedCalendar !== undefined}
                isNewCalendarIdValid={
                  selectedCalendar || isNewCalendarIdValid === null ? true : isNewCalendarIdValid
                }
                jobIds={jobIdOptions}
                onCalendarIdChange={this.onCalendarIdChange}
                onCreate={this.onCreate}
                onDescriptionChange={this.onDescriptionChange}
                onEdit={this.onEdit}
                onEventDelete={this.onEventDelete}
                onGroupSelection={this.onGroupSelection}
                showImportModal={this.showImportModal}
                onJobSelection={this.onJobSelection}
                saving={saving}
                selectedGroupOptions={selectedGroupOptions}
                selectedJobOptions={selectedJobOptions}
                onCreateGroupOption={this.onCreateGroupOption}
                showNewEventModal={this.showNewEventModal}
              />
            </EuiPageContent>
            {modal}
          </EuiPage>
        </Fragment>
      );
    }
  }
);
