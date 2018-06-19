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

import { EventEmitter } from 'events';

const RENDER_COMPLETE_EVENT = 'render_complete';

/**
 * A handler to the embedded visualization. It offers several methods to interact
 * with the visualization.
 */
export class EmbeddedVisualizeHandler {
  constructor(element, scope) {
    this._element = element;
    this._scope = scope;
    this._listeners = new EventEmitter();
    // Listen to the first RENDER_COMPLETE_EVENT to resolve this promise
    this._firstRenderComplete = new Promise(resolve => {
      this._listeners.once(RENDER_COMPLETE_EVENT, resolve);
    });
    this._element.on('renderComplete', () => {
      this._listeners.emit(RENDER_COMPLETE_EVENT);
    });
  }

  /**
   * Update properties of the embedded visualization. This method does not allow
   * updating all initial parameters, but only a subset of the ones allowed
   * in {@link VisualizeLoaderParams}.
   *
   * @param {Object} [params={}] The parameters that should be updated.
   * @property {Object} [timeRange] A new time range for this visualization.
   * @property {Object} [dataAttrs] An object of data attributes to modify. The
   *    key will be the name of the data attribute and the value the value that
   *    attribute will get. Use null to remove a specific data attribute from the visualization.
   */
  update(params = {}) {
    this._scope.$evalAsync(() => {
      if (params.hasOwnProperty('timeRange')) {
        this._scope.timeRange = params.timeRange;
      }
      if (params.hasOwnProperty('filters')) {
        this._scope.filters = params.filters;
      }
      if (params.hasOwnProperty('query')) {
        this._scope.query = params.query;
      }

      // Apply data- attributes to the element if specified
      if (params.dataAttrs) {
        Object.keys(params.dataAttrs).forEach(key => {
          this._element.attr(`data-${key}`, params.dataAttrs[key]);
        });
      }
    });
  }

  /**
   * Destroy the underlying Angular scope of the visualization. This should be
   * called whenever you remove the visualization.
   */
  destroy() {
    this._scope.$destroy();
  }

  /**
   * Return the actual DOM element (wrapped in jQuery) of the rendered visualization.
   * This is especially useful if you used `append: true` in the parameters where
   * the visualization will be appended to the specified container.
   */
  getElement() {
    return this._element;
  }

  /**
   * Returns a promise, that will resolve (without a value) once the first rendering of
   * the visualization has finished. If you want to listen to concecutive rendering
   * events, look into the `addRenderCompleteListener` method.
   *
   * @returns {Promise} Promise, that resolves as soon as the visualization is done rendering
   *    for the first time.
   */
  whenFirstRenderComplete() {
    return this._firstRenderComplete;
  }

  /**
   * Adds a listener to be called whenever the visualization finished rendering.
   * This can be called multiple times, when the visualization rerenders, e.g. due
   * to new data.
   *
   * @param {function} listener The listener to be notified about complete renders.
   */
  addRenderCompleteListener(listener) {
    this._listeners.addListener(RENDER_COMPLETE_EVENT, listener);
  }

  /**
   * Removes a previously registered render complete listener from this handler.
   * This listener will no longer be called when the visualization finished rendering.
   *
   * @param {function} listener The listener to remove from this handler.
   */
  removeRenderCompleteListener(listener) {
    this._listeners.removeListener(RENDER_COMPLETE_EVENT, listener);
  }

}
