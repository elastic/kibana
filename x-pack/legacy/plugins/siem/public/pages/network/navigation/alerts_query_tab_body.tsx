/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { esFilters } from '../../../../../../../../src/plugins/data/common/es_query';
import { AlertsView } from '../../../components/alerts_viewer';
import { NetworkComponentQueryProps } from './types';

export const filterAlertsNetwork: esFilters.Filter = {
  query: {
    bool: {
      filter: [
        {
          bool: {
            should: [
              {
                bool: {
                  should: [
                    {
                      exists: {
                        field: 'source.ip',
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
              {
                bool: {
                  should: [
                    {
                      exists: {
                        field: 'destination.ip',
                      },
                    },
                  ],
                  minimum_should_match: 1,
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
      '{"bool":{"filter":[{"bool":{"should":[{"bool":{"should":[{"exists":{"field": "source.ip"}}],"minimum_should_match":1}},{"bool":{"should":[{"exists":{"field": "destination.ip"}}],"minimum_should_match":1}}],"minimum_should_match":1}}]}}',
  },
};

export const NetworkAlertsQueryTabBody = React.memo((alertsProps: NetworkComponentQueryProps) => (
  <AlertsView {...alertsProps} pageFilters={filterAlertsNetwork} />
));

NetworkAlertsQueryTabBody.displayName = 'NetworkAlertsQueryTabBody';
