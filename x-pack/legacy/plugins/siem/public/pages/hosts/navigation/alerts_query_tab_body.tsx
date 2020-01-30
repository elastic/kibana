/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';

import { esFilters } from '../../../../../../../../src/plugins/data/common/es_query';
import { AlertsView } from '../../../components/alerts_viewer';
import { AlertsComponentQueryProps } from './types';

export const filterHostData: esFilters.Filter[] = [
  {
    query: {
      bool: {
        filter: [
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
        ],
      },
    },
    meta: {
      alias: '',
      disabled: false,
      key: 'bool',
      negate: false,
      type: 'custom',
      value:
        '{"query": {"bool": {"filter": [{"bool": {"should": [{"exists": {"field": "host.name"}}],"minimum_should_match": 1}}]}}}',
    },
  },
];
export const HostAlertsQueryTabBody = React.memo((alertsProps: AlertsComponentQueryProps) => {
  const { pageFilters, ...rest } = alertsProps;
  const hostPageFilters = useMemo(
    () => (pageFilters != null ? [...filterHostData, ...pageFilters] : filterHostData),
    [pageFilters]
  );

  return <AlertsView {...rest} pageFilters={hostPageFilters} />;
});

HostAlertsQueryTabBody.displayName = 'HostAlertsQueryTabBody';
