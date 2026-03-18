/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { COMPLIANCE_BENCHMARK_STATE_SO_TYPE } from '../../../common/compliance';

export const complianceBenchmarkStateType: SavedObjectsType = {
  name: COMPLIANCE_BENCHMARK_STATE_SO_TYPE,
  indexPattern: '.kibana_security_solution',
  hidden: true,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      muted_rules: { type: 'object', enabled: false },
    },
  },
  modelVersions: {
    1: {
      changes: [],
    },
  },
};
