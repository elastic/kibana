/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LastEventTimeData, TimelineData, TimelineDetailsData } from '../../graphql/types';
import { FrameworkRequest } from '../framework';
export * from './elasticsearch_adapter';
import {
  EventsAdapter,
  TimelineRequestOptions,
  LastEventTimeRequestOptions,
  RequestDetailsOptions,
} from './types';

export class Events {
  constructor(private readonly adapter: EventsAdapter) {}

  public async getTimelineData(
    req: FrameworkRequest,
    options: TimelineRequestOptions
  ): Promise<TimelineData> {
    return this.adapter.getTimelineData(req, options);
  }

  public async getTimelineDetails(
    req: FrameworkRequest,
    options: RequestDetailsOptions
  ): Promise<TimelineDetailsData> {
    return this.adapter.getTimelineDetails(req, options);
  }

  public async getLastEventTimeData(
    req: FrameworkRequest,
    options: LastEventTimeRequestOptions
  ): Promise<LastEventTimeData> {
    return this.adapter.getLastEventTimeData(req, options);
  }
}
