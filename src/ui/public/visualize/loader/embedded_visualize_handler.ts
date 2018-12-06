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
import { debounce, forEach } from 'lodash';
import * as Rx from 'rxjs';
import { share } from 'rxjs/operators';
import { Inspector } from '../../inspector';
import { Adapters } from '../../inspector/types';
import { PersistedState } from '../../persisted_state';
import { IPrivate } from '../../private';
import { RenderCompleteHelper } from '../../render_complete';
import { AppState } from '../../state_management/app_state';
import { timefilter } from '../../timefilter';
import { RequestHandlerParams, Vis } from '../../vis';
import { visualizationLoader } from './visualization_loader';
import { VisualizeDataLoader } from './visualize_data_loader';

import { DataAdapter, RequestAdapter } from '../../inspector/adapters';

import { VisSavedObject, VisualizeLoaderParams, VisualizeUpdateParams } from './types';

interface EmbeddedVisualizeHandlerParams extends VisualizeLoaderParams {
  Private: IPrivate;
  queryFilter: any;
  autoFetch?: boolean;
}

const RENDER_COMPLETE_EVENT = 'render_complete';
const LOADING_ATTRIBUTE = 'data-loading';

/**
 * A handler to the embedded visualization. It offers several methods to interact
 * with the visualization.
 */
export class EmbeddedVisualizeHandler {
  /**
   * This observable will emit every time new data is loaded for the
   * visualization. The emitted value is the loaded data after it has
   * been transformed by the visualization's response handler.
   * This should not be used by any plugin.
   * @ignore
   */
  public readonly data$: Rx.Observable<any>;
  public readonly inspectorAdapters: Adapters = {};
  private vis: Vis;
  private loaded: boolean = false;
  private destroyed: boolean = false;

  private listeners = new EventEmitter();
  private firstRenderComplete: Promise<void>;
  private renderCompleteHelper: RenderCompleteHelper;
  private shouldForceNextFetch: boolean = false;
  private debouncedFetchAndRender = debounce(() => {
    if (this.destroyed) {
      return;
    }

    const forceFetch = this.shouldForceNextFetch;
    this.shouldForceNextFetch = false;
    this.fetch(forceFetch).then(this.render);
  }, 100);

  private dataLoaderParams: RequestHandlerParams;
  private readonly appState?: AppState;
  private uiState: PersistedState;
  private dataLoader: VisualizeDataLoader;
  private dataSubject: Rx.Subject<any>;
  private actions: any = {};
  private events$: Rx.Observable<any>;
  private autoFetch: boolean;

  constructor(
    private readonly element: HTMLElement,
    savedObject: VisSavedObject,
    params: EmbeddedVisualizeHandlerParams
  ) {
    const { searchSource, vis } = savedObject;

    const {
      appState,
      uiState,
      queryFilter,
      timeRange,
      filters,
      query,
      Private,
      autoFetch,
    } = params;

    this.dataLoaderParams = {
      searchSource,
      timeRange,
      query,
      queryFilter,
      filters,
      uiState,
      aggs: vis.getAggConfig(),
      forceFetch: false,
    };

    this.autoFetch = !(autoFetch === false);

    // Listen to the first RENDER_COMPLETE_EVENT to resolve this promise
    this.firstRenderComplete = new Promise(resolve => {
      this.listeners.once(RENDER_COMPLETE_EVENT, resolve);
    });

    element.setAttribute(LOADING_ATTRIBUTE, '');
    element.addEventListener('renderComplete', this.onRenderCompleteListener);

    this.appState = appState;
    this.vis = vis;
    if (uiState) {
      vis._setUiState(uiState);
    }
    this.uiState = this.vis.getUiState();

    this.vis.on('update', this.handleVisUpdate);
    this.vis.on('reload', this.reload);
    this.uiState.on('change', this.onUiStateChange);
    timefilter.on('autoRefreshFetch', this.reload);

    this.dataLoader = new VisualizeDataLoader(vis, Private);
    this.renderCompleteHelper = new RenderCompleteHelper(element);
    this.inspectorAdapters = this.getActiveInspectorAdapters();
    this.vis.openInspector = this.openInspector;
    this.vis.hasInspector = this.hasInspector;

    // init default actions
    forEach(this.vis.type.events, (event, eventName) => {
      if (event.disabled || !eventName) {
        return;
      } else {
        this.actions[eventName] = event.defaultAction;
      }
    });

    this.vis.eventsSubject = new Rx.Subject();
    this.events$ = this.vis.eventsSubject.asObservable().pipe(share());
    this.events$.subscribe(event => {
      if (this.actions[event.name]) {
        this.actions[event.name](event.data);
      }
    });

    this.dataSubject = new Rx.Subject();
    this.data$ = this.dataSubject.asObservable().pipe(share());

    this.render();
  }

  /**
   * Update properties of the embedded visualization. This method does not allow
   * updating all initial parameters, but only a subset of the ones allowed
   * in {@link VisualizeUpdateParams}.
   *
   * @param params The parameters that should be updated.
   */
  public update(params: VisualizeUpdateParams = {}) {
    // Apply data- attributes to the element if specified
    const dataAttrs = params.dataAttrs;
    if (dataAttrs) {
      Object.keys(dataAttrs).forEach(key => {
        if (dataAttrs[key] === null) {
          this.element.removeAttribute(`data-${key}`);
          return;
        }

        this.element.setAttribute(`data-${key}`, dataAttrs[key]);
      });
    }

    let fetchRequired = false;
    if (params.hasOwnProperty('timeRange')) {
      fetchRequired = true;
      this.dataLoaderParams.timeRange = params.timeRange;
    }
    if (params.hasOwnProperty('filters')) {
      fetchRequired = true;
      this.dataLoaderParams.filters = params.filters;
    }
    if (params.hasOwnProperty('query')) {
      fetchRequired = true;
      this.dataLoaderParams.query = params.query;
    }

    if (fetchRequired) {
      this.fetchAndRender();
    }
  }

  /**
   * Destroy the underlying Angular scope of the visualization. This should be
   * called whenever you remove the visualization.
   */
  public destroy(): void {
    this.destroyed = true;
    this.debouncedFetchAndRender.cancel();
    timefilter.off('autoRefreshFetch', this.reload);
    this.vis.removeListener('reload', this.reload);
    this.vis.removeListener('update', this.handleVisUpdate);
    this.element.removeEventListener('renderComplete', this.onRenderCompleteListener);
    this.uiState.off('change', this.onUiStateChange);
    visualizationLoader.destroy(this.element);
    this.renderCompleteHelper.destroy();
  }

  /**
   * Return the actual DOM element (wrapped in jQuery) of the rendered visualization.
   * This is especially useful if you used `append: true` in the parameters where
   * the visualization will be appended to the specified container.
   */
  public getElement(): HTMLElement {
    return this.element;
  }

  /**
   * renders visualization with provided data
   * @param visData: visualization data
   */
  public render = (visData: any = null) => {
    return visualizationLoader
      .render(this.element, this.vis, visData, this.uiState, {
        listenOnChange: false,
      })
      .then(() => {
        if (!this.loaded) {
          this.loaded = true;
          if (this.autoFetch) {
            this.fetchAndRender();
          }
        }
      });
  };

  /**
   * Opens the inspector for the embedded visualization. This will return an
   * handler to the inspector to close and interact with it.
   * @return An inspector session to interact with the opened inspector.
   */
  public openInspector = () => {
    return Inspector.open(this.inspectorAdapters, {
      title: this.vis.title,
    });
  };

  public hasInspector = () => {
    return Inspector.isAvailable(this.inspectorAdapters);
  };

  /**
   * Returns a promise, that will resolve (without a value) once the first rendering of
   * the visualization has finished. If you want to listen to consecutive rendering
   * events, look into the `addRenderCompleteListener` method.
   *
   * @returns Promise, that resolves as soon as the visualization is done rendering
   *    for the first time.
   */
  public whenFirstRenderComplete(): Promise<void> {
    return this.firstRenderComplete;
  }

  /**
   * Adds a listener to be called whenever the visualization finished rendering.
   * This can be called multiple times, when the visualization rerenders, e.g. due
   * to new data.
   *
   * @param {function} listener The listener to be notified about complete renders.
   */
  public addRenderCompleteListener(listener: () => void) {
    this.listeners.addListener(RENDER_COMPLETE_EVENT, listener);
  }

  /**
   * Removes a previously registered render complete listener from this handler.
   * This listener will no longer be called when the visualization finished rendering.
   *
   * @param {function} listener The listener to remove from this handler.
   */
  public removeRenderCompleteListener(listener: () => void) {
    this.listeners.removeListener(RENDER_COMPLETE_EVENT, listener);
  }

  private onRenderCompleteListener = () => {
    this.listeners.emit(RENDER_COMPLETE_EVENT);
    this.element.removeAttribute(LOADING_ATTRIBUTE);
  };

  private onUiStateChange = () => {
    this.fetchAndRender();
  };

  /**
   * Returns an object of all inspectors for this vis object.
   * This must only be called after this.type has properly be initialized,
   * since we need to read out data from the the vis type to check which
   * inspectors are available.
   */
  private getActiveInspectorAdapters = (): Adapters => {
    const adapters: Adapters = {};
    const { inspectorAdapters: typeAdapters } = this.vis.type;

    // Add the requests inspector adapters if the vis type explicitly requested it via
    // inspectorAdapters.requests: true in its definition or if it's using the courier
    // request handler, since that will automatically log its requests.
    if ((typeAdapters && typeAdapters.requests) || this.vis.type.requestHandler === 'courier') {
      adapters.requests = new RequestAdapter();
    }

    // Add the data inspector adapter if the vis type requested it or if the
    // vis is using courier, since we know that courier supports logging
    // its data.
    if ((typeAdapters && typeAdapters.data) || this.vis.type.requestHandler === 'courier') {
      adapters.data = new DataAdapter();
    }

    // Add all inspectors, that are explicitly registered with this vis type
    if (typeAdapters && typeAdapters.custom) {
      Object.entries(typeAdapters.custom).forEach(([key, Adapter]) => {
        adapters[key] = new (Adapter as any)();
      });
    }

    return adapters;
  };

  /**
   * Fetches new data and renders the chart. This will happen debounced for a couple
   * of milliseconds, to bundle fast successive calls into one fetch and render,
   * e.g. while resizing the window, this will be triggered constantly on the resize
   * event.
   *
   * @param  forceFetch=false Whether the request handler should be signaled to forceFetch
   *    (i.e. ignore caching in case it supports it). If at least one call to this
   *    passed `true` the debounced fetch and render will be a force fetch.
   */
  private fetchAndRender = (forceFetch = false): void => {
    this.shouldForceNextFetch = forceFetch || this.shouldForceNextFetch;
    this.element.setAttribute(LOADING_ATTRIBUTE, '');
    this.debouncedFetchAndRender();
  };

  private handleVisUpdate = () => {
    if (this.appState) {
      this.appState.vis = this.vis.getState();
      this.appState.save();
    }

    this.fetchAndRender();
  };

  /**
   * Force the fetch of new data and renders the chart again.
   */
  private reload = () => {
    this.fetchAndRender(true);
  };

  private fetch = (forceFetch: boolean = false) => {
    this.dataLoaderParams.aggs = this.vis.getAggConfig();
    this.dataLoaderParams.forceFetch = forceFetch;
    this.dataLoaderParams.inspectorAdapters = this.inspectorAdapters;

    return this.dataLoader.fetch(this.dataLoaderParams).then(data => {
      this.dataSubject.next(data);
      return data;
    });
  };
}
