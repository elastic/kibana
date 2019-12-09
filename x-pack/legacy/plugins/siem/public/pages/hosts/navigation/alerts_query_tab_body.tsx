/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { AlertsComponentsQueryProps } from './types';
import { hostsModel } from '../../../store';
import { AlertsOverTimeQuery } from '../../../containers/alerts/alerts_over_time';
import { manageQuery } from '../../../components/page/manage_query';
import { AlertsOverTimeHistogram } from '../../../components/page/hosts/alerts_over_time';
import { alertsDefaultModel } from '../../../components/alerts_viewer/default_headers';
import { StatefulEventsViewer } from '../../../components/events_viewer';
import * as i18n from '../translations';

const ALERTS_TABLE_ID = 'timeline-alerts-table';
const filter = [
  {
    meta: {
      alias: null,
      negate: false,
      disabled: false,
      type: 'phrase',
      key: 'event.kind',
      params: {
        query: 'alert',
      },
    },
    query: {
      match_phrase: {
        'event.kind': 'alert',
      },
    },
  },
];
const AlertsOverTimeManage = manageQuery(AlertsOverTimeHistogram);
export const AlertsQueryTabBody = ({
  deleteQuery,
  endDate,
  filterQuery,
  indexPattern,
  skip,
  setQuery,
  startDate,
  type,
  updateDateRange = () => {},
}: AlertsComponentsQueryProps) => (
  <>
    <AlertsOverTimeQuery
      endDate={endDate}
      filterQuery={filterQuery}
      sourceId="default"
      startDate={startDate}
      type={hostsModel.HostsType.page}
    >
      {({ alertsOverTime, loading, id, inspect, refetch, totalCount }) => (
        <AlertsOverTimeManage
          data={alertsOverTime!}
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
    </AlertsOverTimeQuery>
    <EuiSpacer size="l" />
    <StatefulEventsViewer
      defaultFilters={filter}
      defaultModel={alertsDefaultModel}
      end={endDate}
      id={ALERTS_TABLE_ID}
      start={startDate}
      timelineTypeContext={{
        documentType: i18n.ALERTS_DOCUMENT_TYPE,
        footerText: i18n.TOTAL_COUNT_OF_ALERTS,
        showCheckboxes: false,
        showRowRenderers: false,
        title: i18n.ALERTS_TABLE_TITLE,
      }}
    />
  </>
);

AlertsQueryTabBody.displayName = 'AlertsQueryTabBody';
