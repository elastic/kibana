/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';

import { State, Context } from '../types';
import { DateFromString } from '../lib/types';
import { parseDuration } from '../lib';

interface ScheduledExecutionOptions {
  actionGroup: string;
  context: Context;
  state: State;
}

const metaSchema = t.partial({
  lastScheduledActions: t.type({
    group: t.string,
    date: DateFromString,
  }),
});
type AlertInstanceMeta = t.TypeOf<typeof metaSchema>;

const stateSchema = t.record(t.string, t.unknown);
type AlertInstanceState = t.TypeOf<typeof stateSchema>;

export const rawAlertInstance = t.partial({
  state: stateSchema,
  meta: metaSchema,
});
export type RawAlertInstance = t.TypeOf<typeof rawAlertInstance>;

export class AlertInstance {
  private scheduledExecutionOptions?: ScheduledExecutionOptions;
  private meta: AlertInstanceMeta;
  private state: AlertInstanceState;

  constructor({ state = {}, meta = {} }: RawAlertInstance = {}) {
    this.state = state;
    this.meta = meta;
  }

  hasScheduledActions() {
    return this.scheduledExecutionOptions !== undefined;
  }

  isThrottled(throttle: string | null) {
    if (this.scheduledExecutionOptions === undefined) {
      return false;
    }
    const throttleMills = throttle ? parseDuration(throttle) : 0;
    const actionGroup = this.scheduledExecutionOptions.actionGroup;
    if (
      this.meta.lastScheduledActions &&
      this.meta.lastScheduledActions.group === actionGroup &&
      this.meta.lastScheduledActions.date.getTime() + throttleMills > Date.now()
    ) {
      return true;
    }
    return false;
  }

  getScheduledActionOptions() {
    return this.scheduledExecutionOptions;
  }

  unscheduleActions() {
    this.scheduledExecutionOptions = undefined;
    return this;
  }

  getState() {
    return this.state;
  }

  scheduleActions(actionGroup: string, context: Context = {}) {
    if (this.hasScheduledActions()) {
      throw new Error('Alert instance execution has already been scheduled, cannot schedule twice');
    }
    this.scheduledExecutionOptions = { actionGroup, context, state: this.state };
    return this;
  }

  replaceState(state: State) {
    this.state = state;
    return this;
  }

  updateLastScheduledActions(group: string) {
    this.meta.lastScheduledActions = { group, date: new Date() };
  }

  /**
   * Used to serialize alert instance state
   */
  toJSON() {
    return rawAlertInstance.encode(this.toRaw());
  }

  toRaw(): RawAlertInstance {
    return {
      state: this.state,
      meta: this.meta,
    };
  }
}
