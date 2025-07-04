/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceNowSIRGetMapping } from './types';

export const getMapping: ServiceNowSIRGetMapping = () => {
  return [
    {
      source: 'title',
      target: 'short_description',
      action_type: 'overwrite',
    },
    {
      source: 'description',
      target: 'description',
      action_type: 'overwrite',
    },
    {
      source: 'comments',
      target: 'work_notes',
      action_type: 'append',
    },
  ];
};
