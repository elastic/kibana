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

export function VisProvider(Private, timefilter) {
  const visTypes = Private(VisTypesRegistryProvider);
  const AggConfigs = Private(VisAggConfigsProvider);
  const brushEvent = Private(UtilsBrushEventProvider);
  const queryFilter = Private(FilterBarQueryFilterProvider);
  const filterBarClickHandler = Private(FilterBarClickHandlerProvider);

  class Vis extends EventEmitter {
    constructor(indexPattern, state, uiState) {
      super();
      state = state || {};

      if (_.isString(state)) {
        state = {
          type: state
        };
      }
      this.indexPattern = indexPattern;

      this.setCurrentState(state);
      this.setState(this.getCurrentState(), false);
      this.setUiState(uiState);

      this.API = {
        timeFilter: timefilter,
        queryFilter: queryFilter,
        events: {
          filter: filterBarClickHandler(state),
          brush: brushEvent(state),
        }
      };
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

      this.aggs = new AggConfigs(this, state.aggs);
    }

    setState(state, updateCurrentState = true) {
      this._state = _.cloneDeep(state);
      if (updateCurrentState) this.resetState();
    }

    updateState() {
      this.setState(this.getCurrentState());
      this.emit('update');
    }

    resetState() {
      this.setCurrentState(this._state);
    }

    getCurrentState(includeDisabled) {
      return {
        title: this.title,
        type: this.type.type,
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
        type: this._state.name,
        params: this._state.params,
        aggs: this._state.aggs
          .filter(agg => includeDisabled || agg.enabled)
      };
    }

    getEnabledState() {
      return this.getStateInternal(false);
    }

    getState() {
      return this.getStateInternal(true);
    }

    clone() {
      const uiJson = this.hasUiState() ? this.getUiState().toJSON() : {};
      return new Vis(this.indexPattern, this.getState(), uiJson);
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

    implementsRenderComplete() {
      return this.type.implementsRenderComplete;
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
