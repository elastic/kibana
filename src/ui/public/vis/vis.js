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

/**
 * @name Vis
 *
 * @description This class consists of aggs, params, listeners, title, and type.
 *  - Aggs: Instances of AggConfig.
 *  - Params: The settings in the Options tab.
 *
 * Not to be confused with vislib/vis.js.
 */

import { EventEmitter } from 'events';
import _ from 'lodash';
import { VisTypesRegistryProvider } from '../registry/vis_types';
import { AggConfigs } from './agg_configs';
import { PersistedState } from '../persisted_state';
import { UtilsBrushEventProvider } from '../utils/brush_event';
import { FilterBarQueryFilterProvider } from '../filter_bar/query_filter';
import { FilterBarClickHandlerProvider } from '../filter_bar/filter_bar_click_handler';
import { updateVisualizationConfig } from './vis_update';
import { queryManagerFactory } from '../query_manager';
import { SearchSourceProvider } from '../courier/data_source/search_source';
import { SavedObjectsClientProvider } from '../saved_objects';

import { Inspector } from '../inspector';
import { RequestAdapter, DataAdapter } from '../inspector/adapters';

const getTerms = (table, columnIndex, rowIndex) => {
  // get only rows where cell value matches current row for all the fields before columnIndex
  const rows = table.rows.filter(row => row.every((cell, i) => cell === table.rows[rowIndex][i] || i >= columnIndex));
  const terms = rows.map(row => row[columnIndex]);

  return [...new Set(terms.filter(term => {
    const notOther = term !== '__other__';
    const notMissing = term !== '__missing__';
    return notOther && notMissing;
  }))];
};

export function VisProvider(Private, Promise, indexPatterns, timefilter, getAppState) {
  const visTypes = Private(VisTypesRegistryProvider);
  const brushEvent = Private(UtilsBrushEventProvider);
  const queryFilter = Private(FilterBarQueryFilterProvider);
  const filterBarClickHandler = Private(FilterBarClickHandlerProvider);
  const SearchSource = Private(SearchSourceProvider);
  const savedObjectsClient = Private(SavedObjectsClientProvider);

  class Vis extends EventEmitter {
    constructor(indexPattern, visState) {
      super();
      visState = visState || {};

      if (_.isString(visState)) {
        visState = {
          type: visState
        };
      }
      this.indexPattern = indexPattern;
      this._setUiState(new PersistedState());
      this.setCurrentState(visState);
      this.setState(this.getCurrentState(), false);

      // Session state is for storing information that is transitory, and will not be saved with the visualization.
      // For instance, map bounds, which depends on the view port, browser window size, etc.
      this.sessionState = {};

      this.API = {
        savedObjectsClient: savedObjectsClient,
        SearchSource: SearchSource,
        indexPatterns: indexPatterns,
        timeFilter: timefilter,
        queryFilter: queryFilter,
        queryManager: queryManagerFactory(getAppState),
        events: {
          // the filter method will be removed in the near feature
          // you should rather use addFilter method below
          filter: (event) => {
            const appState = getAppState();
            filterBarClickHandler(appState)(event);
          },
          addFilter: (data, columnIndex, rowIndex) => {
            const agg = data.columns[columnIndex].aggConfig;
            let filter = [];
            const value = data.rows[rowIndex][columnIndex];
            if (agg.type.name === 'terms' && agg.params.otherBucket) {
              const terms = getTerms(data, columnIndex, rowIndex);
              filter = agg.createFilter(value, { terms });
            } else {
              filter = agg.createFilter(value);
            }
            queryFilter.addFilters(filter);
          }, brush: (event) => {
            const appState = getAppState();
            brushEvent(appState)(event);
          }
        },
        createInheritedSearchSource: (parentSearchSource) => {
          if (!parentSearchSource) {
            throw new Error('Unable to inherit search source, visualize saved object does not have search source.');
          }
          return new SearchSource().inherits(parentSearchSource);
        },
        inspectorAdapters: this._getActiveInspectorAdapters(),
      };
    }

    /**
     * Open the inspector for this visualization.
     * @return {InspectorSession} the handler for the session of this inspector.
     */
    openInspector() {
      return Inspector.open(this.API.inspectorAdapters, {
        title: this.title
      });
    }

    hasInspector() {
      return Inspector.isAvailable(this.API.inspectorAdapters);
    }

    /**
     * Returns an object of all inspectors for this vis object.
     * This must only be called after this.type has properly be initialized,
     * since we need to read out data from the the vis type to check which
     * inspectors are available.
     */
    _getActiveInspectorAdapters() {
      const adapters = {};
      const { inspectorAdapters: typeAdapters } = this.type;

      // Add the requests inspector adapters if the vis type explicitly requested it via
      // inspectorAdapters.requests: true in its definition or if it's using the courier
      // request handler, since that will automatically log its requests.
      if (typeAdapters && typeAdapters.requests || this.type.requestHandler === 'courier') {
        adapters.requests = new RequestAdapter();
      }

      // Add the data inspector adapter if the vis type requested it or if the
      // vis is using courier, since we know that courier supports logging
      // its data.
      if (typeAdapters && typeAdapters.data || this.type.requestHandler === 'courier') {
        adapters.data = new DataAdapter();
      }

      // Add all inspectors, that are explicitly registered with this vis type
      if (typeAdapters && typeAdapters.custom) {
        Object.entries(typeAdapters.custom).forEach(([key, Adapter]) => {
          adapters[key] = new Adapter();
        });
      }

      return adapters;
    }

    isEditorMode() {
      return this.editorMode || false;
    }

    setCurrentState(state) {
      this.title = state.title || '';
      const type = state.type || this.type;
      if (_.isString(type)) {
        this.type = visTypes.byName[type];
        if (!this.type) {
          throw new Error(`Invalid type "${type}"`);
        }
      } else {
        this.type = type;
      }

      this.params = _.defaults({},
        _.cloneDeep(state.params || {}),
        _.cloneDeep(this.type.visConfig.defaults || {})
      );

      updateVisualizationConfig(state.params, this.params);

      this.aggs = new AggConfigs(this, state.aggs);
    }

    setState(state, updateCurrentState = true) {
      this._state = _.cloneDeep(state);
      if (updateCurrentState) this.resetState();
    }

    updateState() {
      this.setState(this.getCurrentState(true));
      this.emit('update');
    }

    resetState() {
      this.setCurrentState(this._state);
    }

    forceReload() {
      this.emit('reload');
    }

    getCurrentState(includeDisabled) {
      return {
        title: this.title,
        type: this.type.name,
        params: this.params,
        aggs: this.aggs
          .map(agg => agg.toJSON())
          .filter(agg => includeDisabled || agg.enabled)
          .filter(Boolean)
      };
    }

    getStateInternal(includeDisabled) {
      return {
        title: this._state.title,
        type: this._state.type,
        params: this._state.params,
        aggs: this._state.aggs
          .filter(agg => includeDisabled || agg.enabled)
      };
    }

    getEnabledState() {
      return this.getStateInternal(false);
    }

    getAggConfig() {
      return new AggConfigs(this, this.aggs.raw.filter(agg => agg.enabled));
    }

    getState() {
      return this.getStateInternal(true);
    }

    /**
     *  Hook for pre-flight logic, see AggType#onSearchRequestStart()
     *  @param {Courier.SearchSource} searchSource
     *  @param {Courier.SearchRequest} searchRequest
     *  @return {Promise<undefined>}
     */
    onSearchRequestStart(searchSource, searchRequest) {
      return Promise.map(
        this.aggs.getRequestAggs(),
        agg => agg.onSearchRequestStart(searchSource, searchRequest)
      );
    }

    isHierarchical() {
      if (_.isFunction(this.type.hierarchicalData)) {
        return !!this.type.hierarchicalData(this);
      } else {
        return !!this.type.hierarchicalData;
      }
    }

    hasSchemaAgg(schemaName, aggTypeName) {
      const aggs = this.aggs.bySchemaName[schemaName] || [];
      return aggs.some(function (agg) {
        if (!agg.type || !agg.type.name) return false;
        return agg.type.name === aggTypeName;
      });
    }

    hasUiState() {
      return !!this.__uiState;
    }

    /***
     * this should not be used outside of visualize
     * @param uiState
     * @private
     */
    _setUiState(uiState) {
      if (uiState instanceof PersistedState) {
        this.__uiState = uiState;
      }
    }

    getUiState() {
      return this.__uiState;
    }

    /**
     * Currently this is only used to extract map-specific information
     * (e.g. mapZoom, mapCenter).
     */
    uiStateVal(key, val) {
      if (this.hasUiState()) {
        if (_.isUndefined(val)) {
          return this.__uiState.get(key);
        }
        return this.__uiState.set(key, val);
      }
      return val;
    }
  }

  Vis.prototype.type = 'histogram';

  return Vis;
}
