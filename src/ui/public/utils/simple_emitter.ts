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

import { BaseObject } from './base_object';

type AnyFunction = (...args: any[]) => void;

interface EventToListenersMapping {
  [key: string]: Array<() => any>;
}

/**
 * Simple event emitter class used in the vislib. Calls
 * handlers synchronously and implements a chainable api
 *
 * @class
 */
export class SimpleEmitter extends BaseObject {
  // A mapping of keys, indicating a certain event name, to arrays of functions, handlers that will be called
  // then that event is emitted.
  private listeners: EventToListenersMapping = {};

  /**
   * Add an event handler
   *
   * @param  {string} name
   * @param  {function} handler
   * @return {SimpleEmitter} - this, for chaining
   */
  public on(name: string, handler: AnyFunction) {
    let handlers = this.listeners[name];
    if (!handlers) {
      handlers = this.listeners[name] = [];
    }

    handlers.push(handler);

    return this;
  }

  /**
   * Remove an event handler
   *
   * @param  {string} name
   * @param  {function} [handler] - optional handler to remove, if no handler is
   *                              passed then all are removed
   * @return {SimpleEmitter} - this, for chaining
   */
  public off(name: string, handlerToRemove?: AnyFunction) {
    if (!this.listeners[name]) {
      return this;
    }

    // remove a specific handler
    if (handlerToRemove) {
      const listenersForEvent = this.listeners[name];
      this.listeners[name] = listenersForEvent.filter(
        (handler: AnyFunction) => handler !== handlerToRemove
      );
    } else {
      // or remove all listeners
      this.listeners[name] = [];
    }

    return this;
  }

  /**
   * Remove all event listeners bound to this emitter.
   *
   * @return {SimpleEmitter} - this, for chaining
   */
  public removeAllListeners() {
    this.listeners = {};
    return this;
  }

  /**
   * Emit an event and all arguments to all listeners for an event name
   *
   * @param  {string} name
   * @param  {*} [arg...] - any number of arguments that will be applied to each handler
   * @return {SimpleEmitter} - this, for chaining
   */
  public emit(name: string, ...args: any[]) {
    if (!this.listeners[name]) {
      return this;
    }

    this.listeners[name].forEach(listener => listener.apply(this, args));
    return this;
  }

  /**
   * Get a list of the event names that currently have listeners
   *
   * @return {array[string]}
   */
  public activeEvents() {
    const activeEvents: string[] = [];

    for (const event in this.listeners) {
      if (!this.listeners.hasOwnProperty(event)) {
        continue;
      }

      if (this.listeners[event].length > 0) {
        activeEvents.push(event);
      }
    }
    return activeEvents;
  }

  public getListeners(name: string) {
    return this.listeners[name] ? this.listeners[name].slice(0) : [];
  }

  /**
   * Get the count of handlers for a specific event.
   *
   * @param [event] - optional event name to filter by
   */
  public listenerCount(name?: string): number {
    if (!name) {
      return Object.keys(this.listeners).reduce(
        (previousValue, eventName) => previousValue + this.listenerCount(eventName),
        0
      );
    }

    return this.listeners[name] ? this.listeners[name].length : 0;
  }
}
