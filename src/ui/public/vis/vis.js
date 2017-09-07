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
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { VisAggConfigsProvider } from 'ui/vis/agg_configs';
import { PersistedState } from 'ui/persisted_state';
import { UtilsBrushEventProvider } from 'ui/utils/brush_event';
import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';
import { FilterBarClickHandlerProvider } from 'ui/filter_bar/filter_bar_click_handler';
import { updateVisualizationConfig } from './vis_update';

export function VisProvider(Private, indexPatterns, timefilter, getAppState) {
  const visTypes = Private(VisTypesRegistryProvider);
  const AggConfigs = Private(VisAggConfigsProvider);
  const brushEvent = Private(UtilsBrushEventProvider);
  const queryFilter = Private(FilterBarQueryFilterProvider);
  const filterBarClickHandler = Private(FilterBarClickHandlerProvider);

  class Vis extends EventEmitter {
    constructor(indexPattern, visState, uiState) {
      super();
      visState = visState || {};

      if (_.isString(visState)) {
        visState = {
          type: visState
        };
      }
      this.indexPattern = indexPattern;

      if (!uiState) {
        uiState = new PersistedState();
      }

      this.setCurrentState(visState);
      this.setState(this.getCurrentState(), false);
      this.setUiState(uiState);

      // Session state is for storing information that is transitory, and will not be saved with the visualization.
      // For instance, map bounds, which depends on the view port, browser window size, etc.
      this.sessionState = {};

      this.API = {
        indexPatterns: indexPatterns,
        timeFilter: timefilter,
        queryFilter: queryFilter,
        events: {
          filter: (event) => {
            const appState = getAppState();
            filterBarClickHandler(appState)(event);
          }, brush: (event) => {
            const appState = getAppState();
            brushEvent(appState)(event);
          }
        }
      };
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

    clone() {
      const uiJson = this.hasUiState() ? this.getUiState().toJSON() : {};
      const uiState = new PersistedState(uiJson);
      const clonedVis = new Vis(this.indexPattern, this.getState(), uiState);
      clonedVis.editorMode = this.editorMode;
      return clonedVis;
    }

    requesting() {
      // Invoke requesting() on each agg. Aggs is an instance of AggConfigs.
      _.invoke(this.aggs.getRequestAggs(), 'requesting');
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

    setUiState(uiState) {
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
