/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEvent } from './generated/schemas';

export type { IEvent, IValidatedEvent } from './generated/schemas';
export { EventSchema, ECS_VERSION } from './generated/schemas';

// the object exposed by plugin.setup()
export interface IEventLogServiceBase {
  isLoggingEntries(): boolean;
  isIndexingEntries(): boolean;
  registerProviderActions(provider: string, actions: string[]): void;
  isProviderActionRegistered(provider: string, action: string): boolean;
  getProviderActions(): Map<string, Set<string>>;
  getLogger(properties: IEvent): IEventLoggerBase;
  getIndexPattern(): string;
  isEsContextReady(): Promise<boolean>;
}

export interface IEventLoggerBase {
  logEvent(properties: IEvent, id?: string): void;
  startTiming(event: IEvent, startTime?: Date): void;
  stopTiming(event: IEvent): void;
}
