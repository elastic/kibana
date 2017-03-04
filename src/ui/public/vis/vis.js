/**
 * @name Vis
 *
 * @description This class consists of aggs, params, listeners, title, and type.
 *  - Aggs: Instances of AggConfig.
 *  - Params: The settings in the Options tab.
 *
 * Not to be confused with vislib/vis.js.
 */

import _ from 'lodash';
import AggTypesIndexProvider from 'ui/agg_types/index';
import RegistryVisTypesProvider from 'ui/registry/vis_types';
import VisAggConfigsProvider from 'ui/vis/agg_configs';
import { PersistedState } from 'ui/persisted_state';

export default function VisFactory(Notifier, Private) {

  const aggTypes = Private(AggTypesIndexProvider);
  const visTypes = Private(RegistryVisTypesProvider);
  const AggConfigs = Private(VisAggConfigsProvider);

  const notify = new Notifier({
    location: 'Vis'
  });

  function Vis(indexPattern, state, uiState) {
    state = state || {};

    if (_.isString(state)) {
      state = {
        type: state
      };
    }

    this.indexPattern = indexPattern;

    this.setState(state);
    this.setUiState(uiState);
  }

  Vis.convertOldState = function (type, oldState) {
    if (!type || _.isString(type)) {
      type = visTypes.byName[type || 'histogram'];
    }

    const schemas = type.schemas;

    // This was put in place to do migrations at runtime. It's used to support people who had saved
    // visualizations during the 4.0 betas.
    const aggs = _.transform(oldState, function (newConfigs, oldConfigs, oldGroupName) {
      const schema = schemas.all.byName[oldGroupName];

      if (!schema) {
        notify.log('unable to match old schema', oldGroupName, 'to a new schema');
        return;
      }

      oldConfigs.forEach(function (oldConfig) {
        const agg = {
          schema: schema.name,
          type: oldConfig.agg
        };

        const aggType = aggTypes.byName[agg.type];
        if (!aggType) {
          notify.log('unable to find an agg type for old confg', oldConfig);
          return;
        }

        agg.params = _.pick(oldConfig, _.keys(aggType.params.byName));

        newConfigs.push(agg);
      });
    }, []);

    return {
      type: type,
      aggs: aggs
    };
  };

  Vis.prototype.type = 'histogram';

  Vis.prototype.setState = function (state) {
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

    this.listeners = _.assign({}, state.listeners, this.type.listeners);
    this.params = _.defaults({},
      _.cloneDeep(state.params || {}),
      _.cloneDeep(this.type.params.defaults || {})
    );

    this.aggs = new AggConfigs(this, state.aggs);
  };

  Vis.prototype.getStateInternal = function (includeDisabled) {
    return {
      title: this.title,
      type: this.type.name,
      params: this.params,
      aggs: this.aggs
        .filter(agg => includeDisabled || agg.enabled)
        .map(agg => agg.toJSON())
        .filter(Boolean),
      listeners: this.listeners
    };
  };

  Vis.prototype.getEnabledState = function () {
    return this.getStateInternal(false);
  };

  Vis.prototype.getState = function () {
    return this.getStateInternal(true);
  };

  Vis.prototype.createEditableVis = function () {
    return this._editableVis || (this._editableVis = this.clone());
  };

  Vis.prototype.getEditableVis = function () {
    return this._editableVis || undefined;
  };

  Vis.prototype.clone = function () {
    const uiJson = this.hasUiState() ? this.getUiState().toJSON() : {};
    return new Vis(this.indexPattern, this.getState(), uiJson);
  };

  Vis.prototype.requesting = function () {
    // Invoke requesting() on each agg. Aggs is an instance of AggConfigs.
    _.invoke(this.aggs.getRequestAggs(), 'requesting');
  };

  Vis.prototype.isHierarchical = function () {
    if (_.isFunction(this.type.hierarchicalData)) {
      return !!this.type.hierarchicalData(this);
    } else {
      return !!this.type.hierarchicalData;
    }
  };

  Vis.prototype.hasSchemaAgg = function (schemaName, aggTypeName) {
    const aggs = this.aggs.bySchemaName[schemaName] || [];
    return aggs.some(function (agg) {
      if (!agg.type || !agg.type.name) return false;
      return agg.type.name === aggTypeName;
    });
  };

  Vis.prototype.hasUiState = function () {
    return !!this.__uiState;
  };
  Vis.prototype.setUiState = function (uiState) {
    if (uiState instanceof PersistedState) {
      this.__uiState = uiState;
    }
  };
  Vis.prototype.getUiState = function () {
    return this.__uiState;
  };

  Vis.prototype.implementsRenderComplete = function () {
    return this.type.implementsRenderComplete;
  };

  /**
   * Currently this is only used to extract map-specific information
   * (e.g. mapZoom, mapCenter).
   */
  Vis.prototype.uiStateVal = function (key, val) {
    if (this.hasUiState()) {
      if (_.isUndefined(val)) {
        return this.__uiState.get(key);
      }
      return this.__uiState.set(key, val);
    }
    return val;
  };

  return Vis;
}
