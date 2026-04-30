/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { IEvent, IEventLogger } from '@kbn/event-log-plugin/server';
import { EventLoggerToken } from './tokens';

export interface EventLogServiceContract {
  logEvent(event: IEvent, id?: string): void;
}

@injectable()
export class EventLogService implements EventLogServiceContract {
  constructor(@inject(EventLoggerToken) private readonly eventLogger: IEventLogger) {}

  public logEvent(event: IEvent, id?: string): void {
    this.eventLogger.logEvent(event, id);
  }
}
