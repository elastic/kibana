/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { StatefulEventsViewer } from '../../../components/events_viewer';
import { HostsComponentsQueryProps } from './types';
import { manageQuery } from '../../../components/page/manage_query';
import { EventsOverTimeHistogram } from '../../../components/page/hosts/events_over_time';
import { EventsOverTimeQuery } from '../../../containers/events/events_over_time';
import { hostsModel } from '../../../store/hosts';
import { eventsDefaultModel } from '../../../components/events_viewer/default_model';

const HOSTS_PAGE_TIMELINE_ID = 'hosts-page';
const EventsOverTimeManage = manageQuery(EventsOverTimeHistogram);

export const EventsQueryTabBody = ({
  endDate,
  filterQuery,
  setQuery,
  startDate,
  updateDateRange = () => {},
}: HostsComponentsQueryProps) => {
  return (
    <>
      <EventsOverTimeQuery
        endDate={endDate}
        filterQuery={filterQuery}
        sourceId="default"
        startDate={startDate}
        type={hostsModel.HostsType.page}
      >
        {({ eventsOverTime, loading, id, inspect, refetch, totalCount }) => (
          <EventsOverTimeManage
            data={eventsOverTime!}
            endDate={endDate}
            id={id}
            inspect={inspect}
            loading={loading}
            refetch={refetch}
            setQuery={setQuery}
            startDate={startDate}
            totalCount={totalCount}
            updateDateRange={updateDateRange}
          />
        )}
      </EventsOverTimeQuery>
      <EuiSpacer size="l" />
      <StatefulEventsViewer
        defaultModel={eventsDefaultModel}
        end={endDate}
        id={HOSTS_PAGE_TIMELINE_ID}
        start={startDate}
      />
    </>
  );
};

EventsQueryTabBody.displayName = 'EventsQueryTabBody';
