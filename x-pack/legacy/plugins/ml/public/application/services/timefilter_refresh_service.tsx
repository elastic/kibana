/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Subject } from 'rxjs';

interface MlTimeFilterUpdate {
  lastRefresh: number;
  timeRange: { start: string; end: string };
}

export const mlTimefilterRefresh$ = new Subject<MlTimeFilterUpdate>();
export const mlTimefilterTimeChange$ = new Subject<MlTimeFilterUpdate>();
