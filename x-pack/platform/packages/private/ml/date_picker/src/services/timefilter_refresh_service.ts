/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';

/**
 * State definition of `mlTimefilterRefresh$` observable.
 */
export interface Refresh {
  /**
   * Timestamp of the last time a refresh got triggered.
   */
  lastRefresh: number;
  /**
   * The time range triggered by the refresh.
   */
  timeRange?: { start: string; end: string };
}

/**
 * Observable to hold `Refresh` state.
 */
export const mlTimefilterRefresh$ = new Subject<Refresh>();
