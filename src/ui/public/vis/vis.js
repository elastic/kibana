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
import { AggTypesIndexProvider } from 'ui/agg_types/index';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { VisAggConfigsProvider } from 'ui/vis/agg_configs';
import { PersistedState } from 'ui/persisted_state';

export function VisProvider(Notifier, Private) {
  const aggTypes = Private(AggTypesIndexProvider);
  const visTypes = Private(VisTypesRegistryProvider);
  const AggConfigs = Private(VisAggConfigsProvider);

  const notify = new Notifier({
    location: 'Vis'
  });

  class Vis {
    constructor(indexPattern, state, uiState) {
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

    convertOldState(type, oldState) {
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
    }

    setState(state) {
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
    }

    getStateInternal(includeDisabled) {
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
    }

    getEnabledState() {
      return this.getStateInternal(false);
    }

    getState() {
      return this.getStateInternal(true);
    }

    createEditableVis() {
      return this._editableVis || (this._editableVis = this.clone());
    }

    getEditableVis() {
      return this._editableVis || undefined;
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
