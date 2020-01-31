/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { PropTypes } from 'prop-types';
import { EuiCheckbox, EuiFlexItem, EuiText, EuiSpacer } from '@elastic/eui';
import { EventsTable } from '../events_table/';
import { FormattedMessage } from '@kbn/i18n/react';

export function ImportedEvents({
  events,
  showRecurringWarning,
  includePastEvents,
  onCheckboxToggle,
  onEventDelete,
}) {
  return (
    <Fragment>
      <EuiSpacer size="s" />
      <EuiFlexItem>
        <EuiText>
          <h4>
            <FormattedMessage
              id="xpack.ml.calendarsEdit.importedEvents.eventsToImportTitle"
              defaultMessage="Events to import: {eventsCount}"
              values={{ eventsCount: events.length }}
            />
          </h4>
          {showRecurringWarning && (
            <EuiText color="danger">
              <p>
                <FormattedMessage
                  id="xpack.ml.calendarsEdit.importedEvents.recurringEventsNotSupportedDescription"
                  defaultMessage="Recurring events not supported. Only the first event will be imported."
                />
              </p>
            </EuiText>
          )}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EventsTable eventsList={events} onDeleteClick={onEventDelete} />
      </EuiFlexItem>
      <EuiSpacer size="m" />
      <EuiFlexItem grow={false}>
        <EuiCheckbox
          id="ml-include-past-events"
          label={
            <FormattedMessage
              id="xpack.ml.calendarsEdit.importedEvents.includePastEventsLabel"
              defaultMessage="Include past events"
            />
          }
          checked={includePastEvents}
          onChange={onCheckboxToggle}
        />
      </EuiFlexItem>
    </Fragment>
  );
}

ImportedEvents.propTypes = {
  events: PropTypes.array.isRequired,
  showRecurringWarning: PropTypes.bool.isRequired,
  includePastEvents: PropTypes.bool.isRequired,
  onCheckboxToggle: PropTypes.func.isRequired,
  onEventDelete: PropTypes.func.isRequired,
};
