/**
 * @name AggConfig
 *
 * @extends IndexedArray
 *
 * @description A "data structure"-like class with methods for indexing and
 * accessing instances of AggConfig.
 */

import _ from 'lodash';
import IndexedArray from 'ui/indexed_array';
import VisAggConfigProvider from 'ui/vis/agg_config';
import AggTypesIndexProvider from 'ui/agg_types/index';
export default function AggConfigsFactory(Private) {
  const AggConfig = Private(VisAggConfigProvider);

  AggConfig.aggTypes = Private(AggTypesIndexProvider);

  _.class(AggConfigs).inherits(IndexedArray);
  function AggConfigs(vis, configStates) {
    const self = this;
    self.vis = vis;

    configStates = AggConfig.ensureIds(configStates || []);

    AggConfigs.Super.call(self, {
      index: ['id'],
      group: ['schema.group', 'type.name', 'schema.name'],
      initialSet: configStates.map(function (aggConfigState) {
        if (aggConfigState instanceof AggConfig) return aggConfigState;
        return new AggConfig(vis, aggConfigState);
      })
    });


    // Set the defaults for any schema which has them. If the defaults
    // for some reason has more then the max only set the max number
    // of defaults (not sure why a someone define more...
    // but whatever). Also if a schema.name is already set then don't
    // set anything.
    if (vis && vis.type && vis.type.schemas && vis.type.schemas.all) {
      _(vis.type.schemas.all)
      .filter(function (schema) {
        return _.isArray(schema.defaults) && schema.defaults.length > 0;
      })
      .each(function (schema) {
        if (!self.bySchemaName[schema.name]) {
          const defaults = schema.defaults.slice(0, schema.max);
          _.each(defaults, function (defaultState) {
            const state = _.defaults({ id: AggConfig.nextId(self) }, defaultState);
            self.push(new AggConfig(vis, state));
          });
        }
      })
      .commit();
    }
  }

  /**
   * Data-by-data comparison of this Aggregation
   * Ignores the non-array indexes
   * @param aggConfigs an AggConfigs instance
   */
  AggConfigs.prototype.jsonDataEquals = function (aggConfigs) {
    if (aggConfigs.length !== this.length) {
      return false;
    }
    for (let i = 0; i < this.length; i += 1) {
      if (!_.isEqual(aggConfigs[i].toJSON(), this[i].toJSON())) {
        return false;
      }
    }
    return true;
  };

  function removeParentAggs(obj) {
    for(const prop in obj) {
      if (prop === 'parentAggs') delete obj[prop];
      else if (typeof obj[prop] === 'object') removeParentAggs(obj[prop]);
    }
  }

  function parseParentAggs(dslLvlCursor, dsl) {
    if (dsl.parentAggs) {
      _.each(dsl.parentAggs, (agg, key) => {
        dslLvlCursor[key] = agg;
        parseParentAggs(dslLvlCursor, agg);
      });
    }
  }

  AggConfigs.prototype.toDsl = function () {
    const dslTopLvl = {};
    let dslLvlCursor;
    let nestedMetrics;

    if (this.vis.isHierarchical()) {
      // collect all metrics, and filter out the ones that we won't be copying
      nestedMetrics = _(this.vis.aggs.bySchemaGroup.metrics)
      .filter(function (agg) {
        return agg.type.name !== 'count';
      })
      .map(function (agg) {
        return {
          config: agg,
          dsl: agg.toDsl()
        };
      })
      .value();
    }
    this.getRequestAggs()
    .filter(function (config) {
      return !config.type.hasNoDsl;
    })
    .forEach(function nestEachConfig(config, i, list) {
      if (!dslLvlCursor) {
        // start at the top level
        dslLvlCursor = dslTopLvl;
      } else {
        const prevConfig = list[i - 1];
        const prevDsl = dslLvlCursor[prevConfig.id];

        // advance the cursor and nest under the previous agg, or
        // put it on the same level if the previous agg doesn't accept
        // sub aggs
        dslLvlCursor = prevDsl.aggs || dslLvlCursor;
      }

      const dsl = dslLvlCursor[config.id] = config.toDsl();
      let subAggs;

      parseParentAggs(dslLvlCursor, dsl);

      if (config.schema.group === 'buckets' && i < list.length - 1) {
        // buckets that are not the last item in the list accept sub-aggs
        subAggs = dsl.aggs || (dsl.aggs = {});
      }

      if (subAggs && nestedMetrics) {
        nestedMetrics.forEach(function (agg) {
          subAggs[agg.config.id] = agg.dsl;
        });
      }
    });

    removeParentAggs(dslTopLvl);
    return dslTopLvl;
  };

  AggConfigs.prototype.getRequestAggs = function () {
    //collect all the aggregations
    const aggregations = this.reduce((requestValuesAggs, agg) => {
      const aggs = agg.getRequestAggs();
      return aggs ? requestValuesAggs.concat(aggs) : requestValuesAggs;
    }, []);
    //move metrics to the end
    return _.sortBy(aggregations, function (agg) {
      return agg.schema.group === 'metrics' ? 1 : 0;
    });
  };

  /**
   * Gets the AggConfigs (and possibly ResponseAggConfigs) that
   * represent the values that will be produced when all aggs
   * are run.
   *
   * With multi-value metric aggs it is possible for a single agg
   * request to result in multiple agg values, which is why the length
   * of a vis' responseValuesAggs may be different than the vis' aggs
   *
   * @return {array[AggConfig]}
   */
  AggConfigs.prototype.getResponseAggs = function () {
    return this.getRequestAggs().reduce(function (responseValuesAggs, agg) {
      const aggs = agg.getResponseAggs();
      return aggs ? responseValuesAggs.concat(aggs) : responseValuesAggs;
    }, []);
  };


  /**
   * Find a response agg by it's id. This may be an agg in the aggConfigs, or one
   * created specifically for a response value
   *
   * @param  {string} id - the id of the agg to find
   * @return {AggConfig}
   */
  AggConfigs.prototype.getResponseAggById = function (id) {
    id = String(id);
    const reqAgg = _.find(this.getRequestAggs(), function (agg) {
      return id.substr(0, String(agg.id).length) === agg.id;
    });
    if (!reqAgg) return;
    return _.find(reqAgg.getResponseAggs(), { id: id });
  };

  return AggConfigs;
}
