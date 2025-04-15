/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimeRange } from '@kbn/es-query';
import { ActorRef, Snapshot } from 'xstate5';

export interface DateRangeToParentEvent {
  type: 'dateRange.update';
}

export type DateRangeParentActor = ActorRef<Snapshot<unknown>, DateRangeToParentEvent>;

export interface DateRangeContext {
  parentRef?: DateRangeParentActor;
  timeRange: TimeRange;
  absoluteTimeRange: {
    start?: number;
    end?: number;
  };
}

export interface DateRangeInput {
  parentRef?: DateRangeParentActor;
}

export type DateRangeEvent =
  | { type: 'dateRange.refresh' }
  | { type: 'dateRange.update'; range: TimeRange };
