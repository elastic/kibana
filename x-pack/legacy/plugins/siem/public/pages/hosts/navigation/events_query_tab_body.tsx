/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { StatefulEventsViewer } from '../../../components/events_viewer';
import { HostsComponentsQueryProps } from './types';
import { hostsModel } from '../../../store/hosts';
import { eventsDefaultModel } from '../../../components/events_viewer/default_model';
import {
  MatrixHistogramOption,
  MatrixHisrogramConfigs,
} from '../../../components/matrix_histogram/types';
import { MatrixHistogramContainer } from '../../../components/matrix_histogram';
import * as i18n from '../translations';
import { HistogramType } from '../../../graphql/types';

const HOSTS_PAGE_TIMELINE_ID = 'hosts-page';
const EVENTS_HISTOGRAM_ID = 'eventsOverTimeQuery';

export const eventsStackByOptions: MatrixHistogramOption[] = [
  {
    text: 'event.action',
    value: 'event.action',
  },
  {
    text: 'event.dataset',
    value: 'event.dataset',
  },
  {
    text: 'event.module',
    value: 'event.module',
  },
];

const DEFAULT_STACK_BY = 'event.action';

export const histogramConfigs: MatrixHisrogramConfigs = {
  defaultStackByOption:
    eventsStackByOptions.find(o => o.text === DEFAULT_STACK_BY) ?? eventsStackByOptions[0],
  errorMessage: i18n.ERROR_FETCHING_EVENTS_DATA,
  histogramType: HistogramType.events,
  stackByOptions: eventsStackByOptions,
  subtitle: undefined,
  title: i18n.NAVIGATION_EVENTS_TITLE,
};

export const EventsQueryTabBody = ({
  deleteQuery,
  endDate,
  filterQuery,
  pageFilters,
  setQuery,
  startDate,
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
        endDate={endDate}
        filterQuery={filterQuery}
        setQuery={setQuery}
        sourceId="default"
        startDate={startDate}
        type={hostsModel.HostsType.page}
        id={EVENTS_HISTOGRAM_ID}
        {...histogramConfigs}
      />
      <StatefulEventsViewer
        defaultModel={eventsDefaultModel}
        end={endDate}
        id={HOSTS_PAGE_TIMELINE_ID}
        start={startDate}
        pageFilters={pageFilters}
      />
    </>
  );
};

EventsQueryTabBody.displayName = 'EventsQueryTabBody';
