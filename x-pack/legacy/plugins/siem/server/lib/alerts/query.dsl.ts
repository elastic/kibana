/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createQueryFilterClauses } from '../../utils/build_query';
import { buildTimelineQuery } from '../events/query.dsl';
import { RequestOptions } from '../framework';

export const buildAlertsQuery = (options: RequestOptions) => {
  const eventsQuery = buildTimelineQuery(options);
  const eventsFilter = eventsQuery.body.query.bool.filter;
  const alertsFilter = [
    ...createQueryFilterClauses({ match: { 'event.kind': { query: 'alert' } } }),
  ];

  return {
    ...eventsQuery,
    body: {
      ...eventsQuery.body,
      query: {
        bool: {
          filter: [...eventsFilter, ...alertsFilter],
        },
      },
    },
  };
};
