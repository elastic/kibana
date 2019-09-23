/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { StatefulEventsViewer } from '../../../components/events_viewer';
import { HostsComponentsQueryProps } from './types';

const HOSTS_PAGE_TIMELINE_ID = 'hosts-page';

export const EventsQueryTabBody = ({
  endDate,
  kqlQueryExpression,
  startDate,
}: HostsComponentsQueryProps) => (
  <StatefulEventsViewer
    end={endDate}
    id={HOSTS_PAGE_TIMELINE_ID}
    kqlQueryExpression={kqlQueryExpression}
    start={startDate}
  />
);

EventsQueryTabBody.displayName = 'EventsQueryTabBody';
