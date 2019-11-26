/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { StatefulAlertsViewer } from '../../../components/alerts_viewer';
import { HostsComponentsQueryProps } from './types';

const HOSTS_PAGE_TIMELINE_ID = 'hosts-page-alerts';

export const AlertsQueryTabBody = ({
  endDate,
  filterQuery,
  setQuery,
  startDate,
  updateDateRange = () => {},
}: HostsComponentsQueryProps) => {
  return (
    <>
      <StatefulAlertsViewer end={endDate} id={HOSTS_PAGE_TIMELINE_ID} start={startDate} />
    </>
  );
};

AlertsQueryTabBody.displayName = 'AlertsQueryTabBody';
