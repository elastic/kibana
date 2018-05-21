import _ from 'lodash';
import dateMath from '@kbn/datemath';

export function calculateBounds(timeRange, forceNow) {
  return {
    min: dateMath.parse(timeRange.from, { forceNow }),
    max: dateMath.parse(timeRange.to, { roundUp: true, forceNow })
  };
}

export function getTime(indexPattern, timeRange, forceNow) {
  if (!indexPattern) {
    //in CI, we sometimes seem to fail here.
    return;
  }

  let filter;
  const timefield = indexPattern.timeFieldName && _.find(indexPattern.fields, { name: indexPattern.timeFieldName });

  if (timefield) {
    const bounds = calculateBounds(timeRange, forceNow);
    filter = { range: {} };
    filter.range[timefield.name] = {
      gte: bounds.min.valueOf(),
      lte: bounds.max.valueOf(),
      format: 'epoch_millis'
    };
  }

  return filter;
}
