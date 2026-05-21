/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEventLogger } from '@kbn/event-log-plugin/server';
import type { ServiceIdentifier } from 'inversify';
import type { EventLogServiceContract } from './event_log_service';

/**
 * Public token for the EventLogService — wraps the `@kbn/event-log-plugin`
 * IEventLogger so alerting_v2 code can write events through a stable contract.
 */
export const EventLogServiceToken = Symbol.for(
  'alerting_v2.EventLogService'
) as ServiceIdentifier<EventLogServiceContract>;

/**
 * Internal token for the underlying IEventLogger created from the eventLog
 * plugin during the OnSetup phase. Consumers should depend on
 * {@link EventLogServiceToken} rather than this token.
 */
export const EventLoggerToken = Symbol.for(
  'alerting_v2.EventLogger'
) as ServiceIdentifier<IEventLogger>;
