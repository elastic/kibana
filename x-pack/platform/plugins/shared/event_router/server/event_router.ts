/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { v4 as uuidv4 } from 'uuid';
import type { Dispatcher } from './dispatcher';
import type { EventTypeRegistry } from './event_type_registry';
import type { PublishEventParams, PublishResult, RouterEvent } from './types';

interface EventRouterDeps {
  eventTypes: EventTypeRegistry;
  dispatcher: Dispatcher;
}

/**
 * The whole delivery path: validate, then hand the event to matching listeners.
 * Nothing is written to Elasticsearch and nothing is polled, so an event that
 * interests no listener costs a map lookup.
 */
export class EventRouter {
  private readonly eventTypes: EventTypeRegistry;
  private readonly dispatcher: Dispatcher;

  constructor({ eventTypes, dispatcher }: EventRouterDeps) {
    this.eventTypes = eventTypes;
    this.dispatcher = dispatcher;
  }

  public async publish(params: PublishEventParams, request: KibanaRequest): Promise<PublishResult> {
    this.eventTypes.validate(params.type, params.payload);
    return this.deliver(params, request);
  }

  /**
   * Validates the whole batch before delivering any of it, so a rejected batch
   * leaves no partially delivered events for the producer to duplicate on retry.
   */
  public async publishBatch(
    events: PublishEventParams[],
    request: KibanaRequest
  ): Promise<PublishResult[]> {
    for (const event of events) {
      this.eventTypes.validate(event.type, event.payload);
    }

    const results: PublishResult[] = [];
    for (const event of events) {
      results.push(await this.deliver(event, request));
    }

    return results;
  }

  private async deliver(
    params: PublishEventParams,
    request: KibanaRequest
  ): Promise<PublishResult> {
    const event: RouterEvent = {
      id: uuidv4(),
      type: params.type,
      attributes: params.attributes ?? {},
      payload: params.payload ?? {},
      receivedAt: new Date().toISOString(),
      spaceId: request.spaceId,
    };

    const { enqueued, failures } = await this.dispatcher.dispatch(event, request);

    return { id: event.id, type: event.type, enqueued, failures };
  }
}
