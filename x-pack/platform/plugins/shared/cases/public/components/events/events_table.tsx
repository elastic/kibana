/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';

import type { EuiBasicTableColumn } from '@elastic/eui';

import { EuiBasicTable, EuiSkeletonText, EuiSpacer, EuiText, EuiEmptyPrompt } from '@elastic/eui';

import { AttachmentType, type EventAttachment } from '../../../common/types/domain';
import type { CaseUI } from '../../../common/ui';
import * as i18n from './translations';
const getColumns = (caseData: CaseUI): Array<EuiBasicTableColumn<EventAttachment>> => [
  {
    name: i18n.DATE_ADDED,
    field: 'createdAt',
    'data-test-subj': 'cases-events-table-date-added',
    dataType: 'date',
  },
  {
    name: 'index',
    field: 'index',
    'data-test-subj': 'cases-events-table-value',
  },
  {
    name: '_id',
    field: 'eventId',
    'data-test-subj': 'cases-events-table-value',
  },
];

const EmptyEventsTable = ({ caseData }: { caseData: CaseUI }) => (
  <EuiEmptyPrompt
    title={<h3>{i18n.NO_EVENTS}</h3>}
    data-test-subj="cases-events-table-empty"
    titleSize="xs"
  />
);

EmptyEventsTable.displayName = 'EmptyEventsTable';

export interface EventsTableProps {
  caseData: CaseUI;
  isLoading: boolean;
}

export const EventsTable = ({ caseData, isLoading }: EventsTableProps) => {
  const filesTableRowProps = useCallback(
    (event: EventAttachment) => ({
      'data-test-subj': `cases-events-table-row-${event.eventId}`,
    }),
    []
  );

  const columns = useMemo(() => getColumns(caseData), [caseData]);

  const events = useMemo(
    () =>
      caseData.comments.filter(
        (comment) => comment.type === AttachmentType.event
      ) as unknown as EventAttachment[],
    [caseData.comments]
  );

  console.log(events);

  return isLoading ? (
    <>
      <EuiSpacer size="l" />
      <EuiSkeletonText data-test-subj="cases-events-table-loading" lines={10} />
    </>
  ) : (
    <>
      {events.length > 0 && (
        <>
          <EuiSpacer size="xl" />
          <EuiText size="xs" color="subdued" data-test-subj="cases-events-table-results-count">
            {i18n.SHOWING_EVENTS(events.length)}
          </EuiText>
        </>
      )}
      <EuiSpacer size="s" />
      <EuiBasicTable
        tableCaption={i18n.EVENTS_TABLE}
        items={events}
        rowHeader="id"
        columns={columns}
        data-test-subj="cases-events-table"
        noItemsMessage={<EmptyEventsTable caseData={caseData} />}
        rowProps={filesTableRowProps}
      />
    </>
  );
};

EventsTable.displayName = 'EventsTable';
