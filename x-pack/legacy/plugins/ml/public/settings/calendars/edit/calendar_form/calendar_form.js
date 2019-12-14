/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { PropTypes } from 'prop-types';

import {
  EuiButton,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import chrome from 'ui/chrome';
import { EventsTable } from '../events_table/';

import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

function EditHeader({ calendarId, description }) {
  return (
    <Fragment>
      <EuiTitle>
        <h1>
          <FormattedMessage
            id="xpack.ml.calendarsEdit.calendarForm.calendarTitle"
            defaultMessage="Calendar {calendarId}"
            values={{ calendarId }}
          />
        </h1>
      </EuiTitle>
      <EuiText>
        <p>{description}</p>
      </EuiText>
      <EuiSpacer size="l" />
    </Fragment>
  );
}

export const CalendarForm = injectI18n(function CalendarForm({
  calendarId,
  canCreateCalendar,
  canDeleteCalendar,
  description,
  eventsList,
  groupIds,
  isEdit,
  isNewCalendarIdValid,
  jobIds,
  onCalendarIdChange,
  onCreate,
  onCreateGroupOption,
  onDescriptionChange,
  onEdit,
  onEventDelete,
  onGroupSelection,
  showImportModal,
  onJobSelection,
  saving,
  selectedGroupOptions,
  selectedJobOptions,
  showNewEventModal,
  intl,
}) {
  const msg = intl.formatMessage({
    id: 'xpack.ml.calendarsEdit.calendarForm.allowedCharactersDescription',
    defaultMessage:
      'Use lowercase alphanumerics (a-z and 0-9), hyphens or underscores; ' +
      'must start and end with an alphanumeric character',
  });
  const helpText = isNewCalendarIdValid === true && !isEdit ? msg : undefined;
  const error = isNewCalendarIdValid === false && !isEdit ? [msg] : undefined;
  const saveButtonDisabled =
    canCreateCalendar === false || saving || !isNewCalendarIdValid || calendarId === '';

  return (
    <EuiForm>
      {!isEdit && (
        <Fragment>
          <EuiTitle>
            <h1>
              <FormattedMessage
                id="xpack.ml.calendarsEdit.calendarForm.createCalendarTitle"
                defaultMessage="Create new calendar"
              />
            </h1>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ml.calendarsEdit.calendarForm.calendarIdLabel"
                defaultMessage="Calendar ID"
              />
            }
            helpText={helpText}
            error={error}
            isInvalid={!isNewCalendarIdValid}
          >
            <EuiFieldText
              name="calendarId"
              value={calendarId}
              onChange={onCalendarIdChange}
              disabled={isEdit === true || saving === true}
            />
          </EuiFormRow>

          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ml.calendarsEdit.calendarForm.descriptionLabel"
                defaultMessage="Description"
              />
            }
          >
            <EuiFieldText
              name="description"
              value={description}
              onChange={onDescriptionChange}
              disabled={isEdit === true || saving === true}
            />
          </EuiFormRow>
        </Fragment>
      )}
      {isEdit && <EditHeader calendarId={calendarId} description={description} />}
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.ml.calendarsEdit.calendarForm.jobsLabel"
            defaultMessage="Jobs"
          />
        }
      >
        <EuiComboBox
          options={jobIds}
          selectedOptions={selectedJobOptions}
          onChange={onJobSelection}
          isDisabled={saving === true || canCreateCalendar === false}
        />
      </EuiFormRow>

      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.ml.calendarsEdit.calendarForm.groupsLabel"
            defaultMessage="Groups"
          />
        }
      >
        <EuiComboBox
          onCreateOption={onCreateGroupOption}
          options={groupIds}
          selectedOptions={selectedGroupOptions}
          onChange={onGroupSelection}
          isDisabled={saving === true || canCreateCalendar === false}
        />
      </EuiFormRow>

      <EuiSpacer size="xl" />

      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.ml.calendarsEdit.calendarForm.eventsLabel"
            defaultMessage="Events"
          />
        }
        fullWidth
      >
        <EventsTable
          canCreateCalendar={canCreateCalendar}
          canDeleteCalendar={canDeleteCalendar}
          eventsList={eventsList}
          onDeleteClick={onEventDelete}
          showImportModal={showImportModal}
          showNewEventModal={showNewEventModal}
          showSearchBar
        />
      </EuiFormRow>
      <EuiSpacer size="l" />
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton
            isDisabled={saving}
            href={`${chrome.getBasePath()}/app/ml#/settings/calendars_list`}
          >
            <FormattedMessage
              id="xpack.ml.calendarsEdit.calendarForm.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-testid="ml_save_calendar_button"
            fill
            onClick={isEdit ? onEdit : onCreate}
            isDisabled={saveButtonDisabled}
          >
            {saving ? (
              <FormattedMessage
                id="xpack.ml.calendarsEdit.calendarForm.savingButtonLabel"
                defaultMessage="Saving…"
              />
            ) : (
              <FormattedMessage
                id="xpack.ml.calendarsEdit.calendarForm.saveButtonLabel"
                defaultMessage="Save"
              />
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiForm>
  );
});

CalendarForm.WrappedComponent.propTypes = {
  calendarId: PropTypes.string.isRequired,
  canCreateCalendar: PropTypes.bool.isRequired,
  canDeleteCalendar: PropTypes.bool.isRequired,
  description: PropTypes.string,
  groupIds: PropTypes.array.isRequired,
  isEdit: PropTypes.bool.isRequired,
  isNewCalendarIdValid: PropTypes.bool.isRequired,
  jobIds: PropTypes.array.isRequired,
  onCalendarIdChange: PropTypes.func.isRequired,
  onCreate: PropTypes.func.isRequired,
  onCreateGroupOption: PropTypes.func.isRequired,
  onDescriptionChange: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onEventDelete: PropTypes.func.isRequired,
  onGroupSelection: PropTypes.func.isRequired,
  showImportModal: PropTypes.func.isRequired,
  onJobSelection: PropTypes.func.isRequired,
  saving: PropTypes.bool.isRequired,
  selectedGroupOptions: PropTypes.array.isRequired,
  selectedJobOptions: PropTypes.array.isRequired,
  showNewEventModal: PropTypes.func.isRequired,
};
