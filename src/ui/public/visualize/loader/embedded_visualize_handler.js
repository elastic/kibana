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

import { debounce } from 'lodash';
import { EventEmitter } from 'events';
import { visualizationLoader } from './visualization_loader';
import { VisualizeDataLoader } from './visualize_data_loader';
import { RenderCompleteHelper } from '../../render_complete';
import { timefilter } from 'ui/timefilter';

const RENDER_COMPLETE_EVENT = 'render_complete';

/**
 * A handler to the embedded visualization. It offers several methods to interact
 * with the visualization.
 */
export class EmbeddedVisualizeHandler {
  constructor(element, savedObject, params) {
    const { searchSource, vis } = savedObject;

    const {
      appState,
      uiState,
      queryFilter,
      timeRange,
      filters,
      query,
      Private,
    } = params;

    const aggs = vis.getAggConfig();

    this._element = element;
    this._params = { uiState, queryFilter, searchSource, aggs, timeRange, filters, query };

    this._listeners = new EventEmitter();
    // Listen to the first RENDER_COMPLETE_EVENT to resolve this promise
    this._firstRenderComplete = new Promise(resolve => {
      this._listeners.once(RENDER_COMPLETE_EVENT, resolve);
    });

    this._elementListener = () => {
      this._listeners.emit(RENDER_COMPLETE_EVENT);
    };

    this._element.addEventListener('renderComplete', this._elementListener);

    this._loaded = false;
    this._destroyed = false;

    this._appState = appState;
    this._vis = vis;
    this._vis._setUiState(uiState);
    this._uiState = this._vis.getUiState();

    this._vis.on('update', this._handleVisUpdate);
    this._vis.on('reload', this._reloadVis);
    this._uiState.on('change', this._fetchAndRender);
    timefilter.on('autoRefreshFetch', this._reloadVis);

    this._visualize = new VisualizeDataLoader(this._vis, Private);
    this._renderCompleteHelper = new RenderCompleteHelper(this._element);

    this._render();
  }

  _handleVisUpdate = () => {
    const visState = this._vis.getState();
    if (this._appState) {
      this._appState.vis = visState;
      this._appState.save();
    }

    this._fetchAndRender();
  };

  _reloadVis = () => {
    this._fetchAndRender(true);
  };

  _fetch = (forceFetch) => {
    // we need to update this before fetch
    this._params.aggs = this._vis.getAggConfig();

    return this._visualize.fetch(this._params, forceFetch);
  };

  _render = (visData) => {
    return visualizationLoader(this._element, this._vis, visData, this._uiState, { listenOnChange: false }).then(() => {
      if (!this._loaded) {
        this._loaded = true;
        this._fetchAndRender();
      }
    });
  };

  _fetchAndRender = debounce((forceFetch = false) => {
    if (this._destroyed) {
      return;
    }

    return this._fetch(forceFetch).then(this._render);
  }, 100);

  /**
   * Update properties of the embedded visualization. This method does not allow
   * updating all initial parameters, but only a subset of the ones allowed
   * in {@link VisualizeLoaderParams}.
   *
   * @param {Object} [params={}] The parameters that should be updated.
   * @property {Object} [timeRange] A new time range for this visualization.
   * @property {Object} [filters] New filters for this visualization.
   * @property {Object} [query] A new query for this visualization.
   * @property {Object} [dataAttrs] An object of data attributes to modify. The
   *    key will be the name of the data attribute and the value the value that
   *    attribute will get. Use null to remove a specific data attribute from the visualization.
   */
  update(params = {}) {
    // Apply data- attributes to the element if specified
    if (params.dataAttrs) {
      Object.keys(params.dataAttrs).forEach(key => {
        if (params.dataAttrs[key] === null) {
          this._element.removeAttribute(`data-${key}`);
          return;
        }

        this._element.setAttribute(`data-${key}`, params.dataAttrs[key]);
      });
    }

    let fetchRequired = false;
    if (params.hasOwnProperty('timeRange')) {
      fetchRequired = true;
      this._params.timeRange = params.timeRange;
    }
    if (params.hasOwnProperty('filters')) {
      fetchRequired = true;
      this._params.filters = params.filters;
    }
    if (params.hasOwnProperty('query')) {
      fetchRequired = true;
      this._params.query = params.query;
    }

    if (fetchRequired) {
      this._fetchAndRender();
    }
  }

  /**
   * Destroy the underlying Angular scope of the visualization. This should be
   * called whenever you remove the visualization.
   */
  destroy() {
    this._destroyed = true;
    this._fetchAndRender.cancel();
    timefilter.off('autoRefreshFetch', this._fetchAndRender);
    this._vis.removeListener('reload', this._reloadVis);
    this._vis.removeListener('update', this._handleVisUpdate);
    this._element.removeEventListener('renderComplete', this._elementListener);
    this._uiState.off('change', this._fetchAndRender);
    visualizationLoader.destroy(this._element);
    this._renderCompleteHelper.destroy();
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
   * Opens the inspector for the embedded visualization. This will return an
   * handler to the inspector to close and interact with it.
   * @return {InspectorSession} An inspector session to interact with the opened inspector.
   */
  openInspector() {
    return this._vis.openInspector();
  }

  /**
   * Returns a promise, that will resolve (without a value) once the first rendering of
   * the visualization has finished. If you want to listen to consecutive rendering
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
