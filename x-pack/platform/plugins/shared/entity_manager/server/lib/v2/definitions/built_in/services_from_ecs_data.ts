/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BuiltInDefinition } from '../../types';
import { BUILT_IN_ID_PREFIX } from './constants';

export const builtInServicesFromEcsEntityDefinition: BuiltInDefinition = {
  type: {
    id: `${BUILT_IN_ID_PREFIX}services_from_ecs_data`,
    display_name: 'Services',
  },
  sources: [
    {
      id: `${BUILT_IN_ID_PREFIX}services_from_ecs_data_ecs`,
      type_id: `${BUILT_IN_ID_PREFIX}services_from_ecs_data`,
      index_patterns: ['logs-*', 'filebeat*', 'traces-*'],
      identity_fields: ['service.name'],
      display_name: 'service.name',
      timestamp_field: '@timestamp',
      metadata_fields: [],
      filters: [],
    },
  ],
};
