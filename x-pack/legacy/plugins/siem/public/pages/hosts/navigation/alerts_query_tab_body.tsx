/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { AlertsView } from '../../../components/alerts_viewer';
import { HostsComponentsQueryProps } from './types';

export const HostAlertsQueryTabBody = React.memo((alertsProps: HostsComponentsQueryProps) => (
  <AlertsView
    {...alertsProps}
    pageFilters={[
      {
        bool: {
          should: [
            {
              exists: {
                field: 'host.name',
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
    ]}
  />
));

HostAlertsQueryTabBody.displayName = 'HostAlertsQueryTabBody';
