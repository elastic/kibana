/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DynamicActionsState,
  UiActionsEnhancedSerializedEvent as SerializedEvent,
} from '@kbn/ui-actions-enhanced-plugin/public';
import { UiActionsEnhancedAbstractActionStorage as AbstractActionStorage } from '@kbn/ui-actions-enhanced-plugin/public';
import {
  VALUE_CLICK_TRIGGER,
  SELECT_RANGE_TRIGGER,
} from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { HasDynamicActions } from './interfaces/has_dynamic_actions';

export type DynamicActionStorageApi = Pick<
  Required<HasDynamicActions>,
  'setDynamicActions' | 'dynamicActionsState$'
>;
export class DynamicActionStorage extends AbstractActionStorage {
  constructor(
    private id: string,
    private getPanelTitle: () => string | undefined,
    private readonly api: DynamicActionStorageApi
  ) {
    super();
  }

  private put(dynamicActionsState: DynamicActionsState) {
    this.api.setDynamicActions({ dynamicActions: dynamicActionsState });
  }

  public async create(event: SerializedEvent) {
    const events = this.getEvents();
    const exists = !!events.find(({ eventId }) => eventId === event.eventId);

    if (exists) {
      throw new Error(
        `[EEXIST]: Event with [eventId = ${event.eventId}] already exists on ` +
          `[embeddable.id = ${this.id}, embeddable.title = ${this.getPanelTitle()}].`
      );
    }

    this.put({
      events: [...events, event],
    });
  }

  public async update(event: SerializedEvent) {
    const dynamicActionsState = this.api.dynamicActionsState$.getValue();
    const events = this.getEvents();
    const index = events.findIndex(({ eventId }) => eventId === event.eventId);

    if (index === -1) {
      throw new Error(
        `[ENOENT]: Event with [eventId = ${event.eventId}] could not be ` +
          `updated as it does not exist in ` +
          `[embeddable.id = ${this.id}, embeddable.title = ${this.getPanelTitle()}].`
      );
    }

    this.put({
      ...dynamicActionsState,
      events: [...events.slice(0, index), event, ...events.slice(index + 1)],
    });
  }

  public async remove(eventId: string) {
    const dynamicActionsState = this.api.dynamicActionsState$.getValue();

    const events = this.getEvents();
    const index = events.findIndex((event) => eventId === event.eventId);

    if (index === -1) {
      throw new Error(
        `[ENOENT]: Event with [eventId = ${eventId}] could not be ` +
          `removed as it does not exist in ` +
          `[embeddable.id = ${this.id}, embeddable.title = ${this.getPanelTitle()}].`
      );
    }

    this.put({
      ...dynamicActionsState,
      events: [...events.slice(0, index), ...events.slice(index + 1)],
    });
  }

  public async read(eventId: string): Promise<SerializedEvent> {
    const events = this.getEvents();
    const event = events.find((ev) => eventId === ev.eventId);

    if (!event) {
      throw new Error(
        `[ENOENT]: Event with [eventId = ${eventId}] could not be found in ` +
          `[embeddable.id = ${this.id}, embeddable.title = ${this.getPanelTitle()}].`
      );
    }

    return event;
  }

  public async list(): Promise<SerializedEvent[]> {
    return this.getEvents();
  }

  private getEvents() {
    const dynamicActionsState = this.api.dynamicActionsState$.getValue();
    const events = dynamicActionsState?.dynamicActions?.events ?? [];
    return this.migrate(events);
  }

  // TODO: https://github.com/elastic/kibana/issues/148005
  // Migration implementation should use registry
  // Action factories implementations should register own migrations
  private migrate(events: SerializedEvent[]): SerializedEvent[] {
    return events.map((event) => {
      // Initially dashboard drilldown relied on VALUE_CLICK & RANGE_SELECT
      if (event.action.factoryId === 'DASHBOARD_TO_DASHBOARD_DRILLDOWN') {
        const migratedTriggers = event.triggers.filter(
          (t) => t !== VALUE_CLICK_TRIGGER && t !== SELECT_RANGE_TRIGGER
        );
        if (
          migratedTriggers.length !== event.triggers.length &&
          !migratedTriggers.includes(`FILTER_TRIGGER`)
        ) {
          migratedTriggers.push(`FILTER_TRIGGER`);
        }

        return {
          ...event,
          triggers: migratedTriggers,
        };
      }
      return event;
    });
  }
}
