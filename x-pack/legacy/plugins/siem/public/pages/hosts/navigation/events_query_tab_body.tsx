/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { StatefulEventsViewer } from '../../../components/events_viewer';
import { HostsComponentsQueryProps } from './types';
import { hostsModel } from '../../../store/hosts';
import { eventsDefaultModel } from '../../../components/events_viewer/default_model';
import { MatrixHistogramOption } from '../../../components/matrix_histogram/types';
import { MatrixHistogramContainer } from '../../../containers/matrix_histogram';
import { MatrixHistogramGqlQuery } from '../../../containers/matrix_histogram/index.gql_query';
import * as i18n from '../translations';

const HOSTS_PAGE_TIMELINE_ID = 'hosts-page';
const EVENTS_HISTOGRAM_ID = 'eventsOverTimeQuery';

const eventsStackByOptions: MatrixHistogramOption[] = [
  {
    text: i18n.NAVIGATION_EVENTS_STACK_BY_EVENT_ACTION,
    value: 'event.action',
  },
];

export const EventsQueryTabBody = ({
  deleteQuery,
  endDate,
  filterQuery,
  setQuery,
  skip,
  startDate,
  updateDateRange = () => {},
}: HostsComponentsQueryProps) => {
  useEffect(() => {
    return () => {
      if (deleteQuery) {
        deleteQuery({ id: EVENTS_HISTOGRAM_ID });
      }
    };
  }, [deleteQuery]);
  return (
    <>
      <MatrixHistogramContainer
        dataKey="EventsHistogram"
        defaultStackByOption={eventsStackByOptions[0]}
        deleteQuery={deleteQuery}
        endDate={endDate}
        isEventsType={true}
        errorMessage={i18n.ERROR_FETCHING_EVENTS_DATA}
        filterQuery={filterQuery}
        query={MatrixHistogramGqlQuery}
        setQuery={setQuery}
        skip={skip}
        sourceId="default"
        stackByOptions={eventsStackByOptions}
        startDate={startDate}
        type={hostsModel.HostsType.page}
        title={i18n.NAVIGATION_EVENTS_TITLE}
        updateDateRange={updateDateRange}
        id={EVENTS_HISTOGRAM_ID}
      />
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
