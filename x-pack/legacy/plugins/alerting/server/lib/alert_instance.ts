/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { State, Context } from '../types';
import { parseDuration } from './parse_duration';

interface Meta {
  lastScheduledActions?: {
    group: string;
    date: Date;
  };
}

interface ScheduledExecutionOptions {
  actionGroup: string;
  context: Context;
  state: State;
}

interface ConstructorOptions {
  state?: State;
  meta?: Meta;
}

export class AlertInstance {
  private scheduledExecutionOptions?: ScheduledExecutionOptions;
  private meta: Meta;
  private state: State;

  constructor({ state = {}, meta = {} }: ConstructorOptions = {}) {
    this.state = state;
    this.meta = meta;
  }

  hasScheduledActions(throttle: string | null) {
    // scheduleActions function wasn't called
    if (this.scheduledExecutionOptions === undefined) {
      return false;
    }
    // Shouldn't schedule actions if still within throttling window
    // Reset if actionGroup changes
    const throttleMills = throttle ? parseDuration(throttle) : 0;
    const actionGroup = this.scheduledExecutionOptions.actionGroup;
    if (
      this.meta.lastScheduledActions &&
      this.meta.lastScheduledActions.group === actionGroup &&
      new Date(this.meta.lastScheduledActions.date).getTime() + throttleMills > Date.now()
    ) {
      return false;
    }
    return true;
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
    if (this.hasScheduledActions(null)) {
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
    return {
      state: this.state,
      meta: this.meta,
    };
  }
}
