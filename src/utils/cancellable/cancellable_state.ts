/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

export type CancelHandler = () => any;

export interface Cancellable {
  cancel: CancelHandler;
}

/**
 * An object that is used internally to the cancellable promise
 * to track the cancellation status and callbacks across the chain of promises.
 */
export class CancellableState {
  public isCancelled = false;

  private cancelHandlers: CancelHandler[] = [];

  /**
   * Adds a cancellation handler to the list of handlers. This
   * handler will be called once if the promise is ever cancelled,
   * regardless of whether or not the promise chain has passed
   * the place where the cancellation handler was declared.
   */
  public addHandler(fn: CancelHandler) {
    this.cancelHandlers.push(fn);
  }

  /**
   * Adds a reference to a nested cancellable, so that if the outer
   * cancellable is cancelled, the nested / child cancellable will
   * also be cancelled. (See the tests for an example of this.)
   */
  public addChild(cancellable: Cancellable) {
    this.cancelHandlers.push(() => cancellable.cancel());
  }

  /**
   * Cancels the promise chain and executes the handlers.
   *
   * @returns {Promise<void>}
   */
  public async cancel() {
    if (this.isCancelled) {
      return;
    }

    this.isCancelled = true;
    for (const fn of this.cancelHandlers) {
      await fn();
    }
  }
}
