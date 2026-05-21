/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SwimlaneType } from '@kbn/ml-server-schemas/embeddables/anomaly_swimlane';

export const SWIMLANE_TYPE = {
  OVERALL: 'overall',
  VIEW_BY: 'viewBy',
} as const satisfies Record<string, SwimlaneType>;
