/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { State, Context } from '../types';
import { parseDuration } from './parse_duration';

interface Meta {
  groups?: {
    [group: string]: {
      lastFired?: number;
    };
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
    if (
      throttle &&
      this.meta.groups &&
      this.meta.groups[this.fireOptions.actionGroup] &&
      this.meta.groups[this.fireOptions.actionGroup].lastFired !== undefined &&
      this.meta.groups[this.fireOptions.actionGroup].lastFired! + parseDuration(throttle) >
        Date.now()
    ) {
      return false;
    }
    return true;
  }

  isObsolete(throttle?: string) {
    const isNotFiring = !this.shouldFire(throttle);
    let isAGroupStillThrottled = false;

    if (throttle && this.meta.groups) {
      for (const group of Object.keys(this.meta.groups)) {
        if (
          this.meta.groups[group].lastFired !== undefined &&
          this.meta.groups[group].lastFired! + parseDuration(throttle) > Date.now()
        ) {
          // This group is still throttled and makes this instance not obsolete
          isAGroupStillThrottled = true;
        }
      }
    }

    return isNotFiring && !isAGroupStillThrottled;
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
