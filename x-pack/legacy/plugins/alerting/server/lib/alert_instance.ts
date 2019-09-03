/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { State, Context } from '../types';

interface ConstructorOptions {
  state?: Record<string, any>;
  meta?: Record<string, any>;
}

export class AlertInstance {
  private fireOptions?: Record<string, any>;
  private meta: Record<string, any>;
  private state: Record<string, any>;

  constructor({ state = {}, meta = {} }: ConstructorOptions = {}) {
    this.state = state;
    this.meta = meta;
  }

  shouldFire() {
    return this.fireOptions !== undefined;
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

  replaceMeta(meta: Record<string, any>) {
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
