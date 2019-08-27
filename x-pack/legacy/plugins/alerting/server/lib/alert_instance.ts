/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { State, Context } from '../types';
import { parseDuration } from './parse_duration';

interface Meta {
  lastFired?: {
    group: string;
    epocTime: number;
  };
}

interface FireOptions {
  actionGroup: string;
  context: Context;
  state: State;
}

interface ConstructorOptions {
  state?: State;
  meta?: Meta;
}

export class AlertInstance {
  private fireOptions?: FireOptions;
  private meta: Meta;
  private state: State;

  constructor({ state = {}, meta = {} }: ConstructorOptions = {}) {
    this.state = state;
    this.meta = meta;
  }

  shouldFire(throttle?: string) {
    // Fire function wasn't called
    if (this.fireOptions === undefined) {
      return false;
    }
    // Should be throttled and not fire
    const throttleMills = throttle ? parseDuration(throttle) : 0;
    const actionGroup = this.fireOptions.actionGroup;
    if (
      this.meta.lastFired &&
      this.meta.lastFired.group === actionGroup &&
      this.meta.lastFired.epocTime + throttleMills > Date.now()
    ) {
      return false;
    }
    return true;
  }

  isResolved(throttle?: string) {
    // At this time we'll consider instances that didn't fire as resolved
    return !this.shouldFire(throttle);
  }

  getFireOptions() {
    return this.fireOptions;
  }

  resetFire() {
    this.fireOptions = undefined;
    return this;
  }

  getState() {
    return this.state;
  }

  getMeta() {
    return this.meta;
  }

  fire(actionGroup: string, context: Context = {}) {
    if (this.shouldFire()) {
      throw new Error('Alert instance already fired, cannot fire twice');
    }
    this.fireOptions = { actionGroup, context, state: this.state };
    return this;
  }

  replaceState(state: State) {
    this.state = state;
    return this;
  }

  replaceMeta(meta: Meta) {
    this.meta = meta;
    return this;
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
