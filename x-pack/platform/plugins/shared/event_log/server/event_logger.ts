/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { Logger } from '@kbn/core/server';
import { merge } from 'lodash';

import { coerce } from 'semver';
import { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import { Plugin } from './plugin';
import { EsContext } from './es';
import { EventLogService } from './event_log_service';
import { millisToNanos } from '../common';
import {
  IEvent,
  IValidatedEvent,
  IEventLogger,
  IEventLogService,
  ECS_VERSION,
  EventSchema,
} from './types';
import { SAVED_OBJECT_REL_PRIMARY } from './types';
import { Doc, InternalFields } from './es/cluster_client_adapter';

type SystemLogger = Plugin['systemLogger'];

interface IEventLoggerCtorParams {
  esContext: EsContext;
  eventLogService: EventLogService;
  initialProperties: IEvent;
  systemLogger: SystemLogger;
}

export class EventLogger implements IEventLogger {
  private esContext: EsContext;
  private eventLogService: EventLogService;
  private initialProperties: IEvent;
  private systemLogger: SystemLogger;

  constructor(ctorParams: IEventLoggerCtorParams) {
    this.esContext = ctorParams.esContext;
    this.eventLogService = ctorParams.eventLogService;
    this.initialProperties = ctorParams.initialProperties;
    this.systemLogger = ctorParams.systemLogger;
  }

  startTiming(event: IEvent, startTime?: Date): void {
    if (event == null) return;
    event.event = event.event || {};

    const start = startTime ?? new Date();
    event.event.start = start.toISOString();
  }

  stopTiming(event: IEvent): void {
    if (event?.event == null) return;

    const start = getEventStart(event);
    if (start == null || isNaN(start)) return;

    const end = Date.now();
    event.event.end = new Date(end).toISOString();
    event.event.duration = millisToNanos(end - start);
  }

  // non-blocking, but spawns an async task to do the work
  logEvent(eventProperties: IEvent): void {
    const event: IEvent = {};
    const fixedProperties = {
      ecs: {
        version: ECS_VERSION,
      },
      kibana: {
        server_uuid: this.eventLogService.kibanaUUID,
        version: coerce(this.eventLogService.kibanaVersion)?.version,
      },
    };

    const defaultProperties = {
      '@timestamp': new Date().toISOString(),
    };

    // merge the initial properties and event properties
    merge(event, defaultProperties, this.initialProperties, eventProperties, fixedProperties);

    let validatedEvent: IValidatedEvent;
    try {
      validatedEvent = validateEvent(this.eventLogService, event);
    } catch (err) {
      this.systemLogger.warn(`invalid event logged: ${err.message}; ${JSON.stringify(event)})`);
      return;
    }

    const doc: Doc = {
      index: this.esContext.esNames.dataStream,
      body: validatedEvent,
    };

    if (this.eventLogService.isIndexingEntries()) {
      indexEventDoc(this.esContext, doc);
    }

    if (this.eventLogService.isLoggingEntries()) {
      logEventDoc(this.systemLogger, doc);
    }
  }

  async updateEvents(
    events: Array<{ internalFields: InternalFields; event: IEvent }>
  ): Promise<BulkResponse> {
    const dataStream = this.esContext.esNames.dataStream;

    const docs: Array<Required<Doc>> = events.map((event) => ({
      index: dataStream,
      body: event.event,
      internalFields: event.internalFields,
    }));

    if (!this.eventLogService.isIndexingEntries()) {
      throw new Error('Faield to update events: Indexing is not enabled');
    }

    const result = await updateEventDocs(this.esContext, docs);

    if (this.eventLogService.isLoggingEntries()) {
      logUpdateEventDoc(this.systemLogger, docs);
    }

    return result;
  }
}

// return the epoch millis of the start date, or null; may be NaN if garbage
function getEventStart(event: IEvent): number | null {
  if (event?.event?.start == null) return null;

  return Date.parse(event.event.start);
}

const RequiredEventSchema = schema.object({
  provider: schema.string({ minLength: 1 }),
  action: schema.string({ minLength: 1 }),
});

const ValidSavedObjectRels = new Set([undefined, SAVED_OBJECT_REL_PRIMARY]);

function validateEvent(eventLogService: IEventLogService, event: IEvent): IValidatedEvent {
  if (event?.event == null) {
    throw new Error(`no "event" property`);
  }

  // ensure there are provider/action properties in event as strings
  const requiredProps = {
    provider: event.event.provider,
    action: event.event.action,
  };

  // will throw an error if structure doesn't validate
  const { provider, action } = RequiredEventSchema.validate(requiredProps);

  if (!eventLogService.isProviderActionRegistered(provider, action)) {
    throw new Error(`unregistered provider/action: "${provider}" / "${action}"`);
  }

  // could throw an error
  const result = EventSchema.validate(event);

  if (result?.kibana?.saved_objects?.length) {
    for (const so of result?.kibana?.saved_objects) {
      if (!ValidSavedObjectRels.has(so.rel)) {
        throw new Error(`invalid rel property in saved_objects: "${so.rel}"`);
      }
    }
  }

  return result;
}

export const EVENT_LOGGED_PREFIX = `event logged: `;

function logEventDoc(logger: Logger, doc: Doc): void {
  logger.info(`event logged: ${JSON.stringify(doc.body)}`);
}

function logUpdateEventDoc(logger: Logger, docs: Array<Required<Doc>>): void {
  logger.info(`event updated: ${JSON.stringify(docs.length)}`);
}

function indexEventDoc(esContext: EsContext, doc: Doc): void {
  esContext.esAdapter.indexDocument(doc);
}

async function updateEventDocs(
  esContext: EsContext,
  docs: Array<Required<Doc>>
): Promise<BulkResponse> {
  return esContext.esAdapter.updateDocuments(docs);
}
