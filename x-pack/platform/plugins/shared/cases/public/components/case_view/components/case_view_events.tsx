/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem } from '@elastic/eui';
import React, { useMemo } from 'react';
import { type CaseUI } from '../../../../common';
import { CASE_VIEW_PAGE_TABS } from '../../../../common/types';
import { CaseViewTabs } from '../case_view_tabs';
import type { CaseViewProps } from '../types';

import { AttachmentType, type EventAttachment } from '../../../../common/types/domain';
import { useGetEvents } from '../../../containers/use_get_events';
import { useEventsDataView } from '../../events/use_events_data_view';

interface CaseViewEventsProps {
  caseData: CaseUI;
  renderEventsTable: CaseViewProps['renderEventsTable'];
}

export const CaseViewEvents = ({
  caseData,
  renderEventsTable: EventsTable,
}: CaseViewEventsProps) => {
  const events = useMemo(
    () =>
      caseData.comments.filter(
        (comment) => comment.type === AttachmentType.event
      ) as unknown as EventAttachment[],
    [caseData.comments]
  );

  const indexPattern = useMemo(() => events.map((event) => event.index).join(','), [events]);

  const { dataView: eventsDataView } = useEventsDataView(indexPattern);

  const eventsParameters = useMemo(() => {
    return {
      caseId: caseData.id,
      columns: ['*'],
      eventIds: events.flatMap((event) => event.eventId),
    };
  }, [caseData.id, events]);

  const eventsResponse = useGetEvents(eventsDataView, eventsParameters);

  if (!eventsDataView) {
    return null;
  }

  if (!eventsResponse.data) {
    return null;
  }

  if (!EventsTable) {
    return null;
  }

  return (
    <EuiFlexItem data-test-subj="case-view-events">
      <CaseViewTabs caseData={caseData} activeTab={CASE_VIEW_PAGE_TABS.EVENTS} />
      <EventsTable data={eventsResponse.data} dataView={eventsDataView} />
    </EuiFlexItem>
  );
};
CaseViewEvents.displayName = 'CaseViewEvents';
