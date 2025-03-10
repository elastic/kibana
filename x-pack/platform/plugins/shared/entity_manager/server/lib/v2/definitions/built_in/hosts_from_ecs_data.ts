/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BUILT_IN_ID_PREFIX } from './constants';
import { BuiltInDefinition } from '../../types';

export const builtInHostsFromEcsEntityDefinition: BuiltInDefinition = {
  type: {
    id: `${BUILT_IN_ID_PREFIX}hosts_from_ecs_data`,
    display_name: 'Hosts',
  },
  sources: [
    {
      id: `${BUILT_IN_ID_PREFIX}hosts_from_ecs_data_ecs`,
      type_id: `${BUILT_IN_ID_PREFIX}hosts_from_ecs_data`,
      index_patterns: ['filebeat-*', 'logs-*', 'metrics-*', 'metricbeat-*'],
      identity_fields: ['host.name'],
      display_name: 'host.name',
      timestamp_field: '@timestamp',
      metadata_fields: [],
      filters: [],
    },
  ],
};
