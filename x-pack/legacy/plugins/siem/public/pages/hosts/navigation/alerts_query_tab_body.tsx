/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { AlertsComponentsQueryProps } from './types';
import { StatefulAlertsViewer } from '../../../components/alerts_viewer';

const ALERTS_TABLE_ID = 'timeline-alerts-table';

export const AlertsQueryTabBody = ({
  deleteQuery,
  endDate,
  filterQuery,
  indexPattern,
  skip,
  setQuery,
  startDate,
  type,
}: AlertsComponentsQueryProps) => (
  <StatefulAlertsViewer end={endDate} id={ALERTS_TABLE_ID} start={startDate} />
);

AlertsQueryTabBody.displayName = 'AlertsQueryTabBody';
