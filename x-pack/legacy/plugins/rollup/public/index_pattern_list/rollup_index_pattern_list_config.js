/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IndexPatternListConfig } from '../../../../../../src/legacy/core_plugins/management/public';

function isRollup(indexPattern) {
  return (
    indexPattern.type === 'rollup' || (indexPattern.get && indexPattern.get('type') === 'rollup')
  );
}

export class RollupIndexPatternListConfig extends IndexPatternListConfig {
  key = 'rollup';

  getIndexPatternTags = indexPattern => {
    return isRollup(indexPattern)
      ? [
          {
            key: 'rollup',
            name: 'Rollup',
          },
        ]
      : [];
  };

  getFieldInfo = (indexPattern, field) => {
    if (!isRollup(indexPattern)) {
      return [];
    }

    const allAggs = indexPattern.typeMeta && indexPattern.typeMeta.aggs;
    const fieldAggs = allAggs && Object.keys(allAggs).filter(agg => allAggs[agg][field]);

    if (!fieldAggs || !fieldAggs.length) {
      return [];
    }

    return ['Rollup aggregations:'].concat(
      fieldAggs.map(aggName => {
        const agg = allAggs[aggName][field];
        switch (aggName) {
          case 'date_histogram':
            return `${aggName} (interval: ${agg.interval}, ${
              agg.delay ? `delay: ${agg.delay},` : ''
            } ${agg.time_zone})`;
            break;
          case 'histogram':
            return `${aggName} (interval: ${agg.interval})`;
          default:
            return aggName;
        }
      })
    );
  };

  areScriptedFieldsEnabled = indexPattern => {
    return !isRollup(indexPattern);
  };
}
