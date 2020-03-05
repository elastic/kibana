/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React, { Fragment } from 'react';
import moment from 'moment';

import { EuiButton, EuiButtonEmpty, EuiInMemoryTable, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

export const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

function DeleteButton({ onClick, canDeleteCalendar }) {
  return (
    <Fragment>
      <EuiButtonEmpty
        size="xs"
        color="danger"
        onClick={onClick}
        isDisabled={canDeleteCalendar === false}
      >
        <FormattedMessage
          id="xpack.ml.calendarsEdit.eventsTable.deleteButtonLabel"
          defaultMessage="Delete"
        />
      </EuiButtonEmpty>
    </Fragment>
  );
}

export const EventsTable = ({
  canCreateCalendar,
  canDeleteCalendar,
  eventsList,
  onDeleteClick,
  showSearchBar,
  showImportModal,
  showNewEventModal,
}) => {
  const sorting = {
    sort: {
      field: 'description',
      direction: 'asc',
    },
  };

  const pagination = {
    initialPageSize: 5,
    pageSizeOptions: [5, 10],
  };

  const columns = [
    {
      field: 'description',
      name: i18n.translate('xpack.ml.calendarsEdit.eventsTable.descriptionColumnName', {
        defaultMessage: 'Description',
      }),
      sortable: true,
      truncateText: true,
      scope: 'row',
    },
    {
      field: 'start_time',
      name: i18n.translate('xpack.ml.calendarsEdit.eventsTable.startColumnName', {
        defaultMessage: 'Start',
      }),
      sortable: true,
      render: timeMs => {
        const time = moment(timeMs);
        return time.format(TIME_FORMAT);
      },
    },
    {
      field: 'end_time',
      name: i18n.translate('xpack.ml.calendarsEdit.eventsTable.endColumnName', {
        defaultMessage: 'End',
      }),
      sortable: true,
      render: timeMs => {
        const time = moment(timeMs);
        return time.format(TIME_FORMAT);
      },
    },
    {
      field: '',
      name: '',
      render: event => (
        <DeleteButton
          data-testid="event_delete"
          canDeleteCalendar={canDeleteCalendar}
          onClick={() => {
            onDeleteClick(event.event_id);
          }}
        />
      ),
    },
  ];

  const search = {
    toolsRight: [
      <EuiButton
        isDisabled={canCreateCalendar === false}
        key="ml_new_event"
        data-testid="ml_new_event"
        size="s"
        iconType="plusInCircle"
        onClick={showNewEventModal}
      >
        <FormattedMessage
          id="xpack.ml.calendarsEdit.eventsTable.newEventButtonLabel"
          defaultMessage="New event"
        />
      </EuiButton>,
      <EuiButton
        isDisabled={canCreateCalendar === false}
        key="ml_import_event"
        data-testid="ml_import_events"
        size="s"
        iconType="importAction"
        onClick={showImportModal}
      >
        <FormattedMessage
          id="xpack.ml.calendarsEdit.eventsTable.importEventsButtonLabel"
          defaultMessage="Import events"
        />
      </EuiButton>,
    ],
    box: {
      incremental: true,
    },
    filters: [],
  };

  return (
    <Fragment>
      <EuiSpacer size="m" />
      <EuiInMemoryTable
        items={eventsList}
        itemId="event_id"
        columns={columns}
        pagination={pagination}
        sorting={sorting}
        search={showSearchBar ? search : undefined}
      />
    </Fragment>
  );
};

EventsTable.propTypes = {
  canCreateCalendar: PropTypes.bool,
  canDeleteCalendar: PropTypes.bool,
  eventsList: PropTypes.array.isRequired,
  onDeleteClick: PropTypes.func.isRequired,
  showImportModal: PropTypes.func,
  showNewEventModal: PropTypes.func,
  showSearchBar: PropTypes.bool,
};

EventsTable.defaultProps = {
  showSearchBar: false,
  canCreateCalendar: true,
  canDeleteCalendar: true,
};
