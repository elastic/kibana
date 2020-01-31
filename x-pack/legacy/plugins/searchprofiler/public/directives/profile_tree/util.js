/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import tinycolor from 'tinycolor2';
import _ from 'lodash';

const comparator = (v1, v2) => {
  if (v1 < v2) {
    return 1;
  }
  return v1 > v2 ? -1 : 0;
};

function getToolTip(key) {
  switch (key) {
    case 'build_scorer':
      return 'The time taken to create the Scoring object, which is later used to execute the actual scoring of each doc.';
    case 'create_weight':
      return 'The time taken to create the Weight object, which holds temporary information during scoring.';
    case 'next_doc':
      return 'The time taken to advance the iterator to the next matching document.';
    case 'score':
      return 'The time taken in actually scoring the document against the query.';
    case 'match':
      return 'The time taken to execute a secondary, more precise scoring phase (used by phrase queries).';
    case 'advance':
      return 'The time taken to advance the iterator to the next document.';
    default:
      return '';
  }
}

export function timeInMilliseconds(data) {
  if (data.time_in_nanos) {
    return data.time_in_nanos / 1000000;
  }

  if (typeof data.time === 'string') {
    return data.time.replace('ms', '');
  }

  return data.time;
}

export function calcTimes(data, parentId) {
  if (data == null) {
    return;
  }

  let totalTime = 0;
  //First pass to collect total
  for (const child of data) {
    totalTime += timeInMilliseconds(child);

    child.id = uuid.v4();
    child.parentId = parentId;
    child.childrenIds = [];
    child.breakdown = normalizeBreakdown(child.breakdown);

    let childrenTime = 0;
    if (child.children != null && child.children.length !== 0) {
      childrenTime = calcTimes(child.children, child.id);
      child.hasChildren = true;

      // Save the IDs of our children, has to be called after calcTimes recursion above
      for (const c of child.children) {
        child.childrenIds.push(c.id);
      }
    }
    child.selfTime = timeInMilliseconds(child) - childrenTime;
  }
  return totalTime;
}

export function normalizeBreakdown(breakdown) {
  const final = [];
  const total = Object.keys(breakdown).reduce((partialTotal, currentKey) => {
    if (currentKey.indexOf('_count') === -1) {
      partialTotal += breakdown[currentKey];
    }
    return partialTotal;
  }, 0);
  Object.keys(breakdown)
    .sort()
    .forEach(key => {
      let relative = 0;
      if (key.indexOf('_count') === -1) {
        relative = ((breakdown[key] / total) * 100).toFixed(1);
      }
      final.push({
        key: key,
        time: breakdown[key],
        relative: relative,
        color: tinycolor.mix('#F5F5F5', '#FFAFAF', relative).toHexString(),
        tip: getToolTip(key),
      });
    });

  // Sort by time descending and then key ascending
  return final.sort((a, b) => {
    if (comparator(a.time, b.time) !== 0) {
      return comparator(a.time, b.time);
    }

    return -1 * comparator(a.key, b.key);
  });
}

export function normalizeTimes(data, totalTime, depth) {
  //Second pass to normalize
  for (const child of data) {
    child.timePercentage = ((timeInMilliseconds(child) / totalTime) * 100).toFixed(2);
    child.absoluteColor = tinycolor.mix('#F5F5F5', '#FFAFAF', child.timePercentage).toHexString();
    child.depth = depth;

    if (child.children != null && child.children.length !== 0) {
      normalizeTimes(child.children, totalTime, depth + 1);
    }
  }

  data.sort((a, b) => comparator(timeInMilliseconds(a), timeInMilliseconds(b)));
}

export function normalizeIndices(indices, visibility, target) {
  // Sort the shards per-index
  let sortQueryComponents;
  if (target === 'searches') {
    sortQueryComponents = (a, b) => {
      const aTime = _.sum(a.searches, search => {
        return search.flat[0].time;
      });
      const bTime = _.sum(b.searches, search => {
        return search.flat[0].time;
      });

      return comparator(aTime, bTime);
    };
  } else if (target === 'aggregations') {
    sortQueryComponents = (a, b) => {
      const aTime = _.sum(a.aggregations, agg => {
        return agg.flat[0].time;
      });
      const bTime = _.sum(b.aggregations, agg => {
        return agg.flat[0].time;
      });

      return comparator(aTime, bTime);
    };
  }
  const sortedIndices = [];
  for (const [key, index] of Object.entries(indices)) {
    index.shards.sort(sortQueryComponents);
    for (const shard of index.shards) {
      shard.relative[target] = ((shard.time[target] / index.time[target]) * 100).toFixed(2);
      shard.color[target] = tinycolor
        .mix('#F5F5F5', '#FFAFAF', shard.relative[target])
        .toHexString();
    }
    sortedIndices.push(index);
    visibility[key] = false;
  }

  // And now sort the indices themselves
  sortedIndices.sort((a, b) => comparator(a.time, b.time));
  return sortedIndices;
}

export function flattenResults(data, accumulator, depth, visibleMap) {
  if (data == null) {
    return;
  }

  for (const child of data) {
    // For bwc of older profile responses
    if (!child.description) {
      child.description = child.lucene;
      child.lucene = null;

      child.type = child.query_type;
      child.query_type = null;
    }
    accumulator.push({
      id: child.id,
      parentId: child.parentId,
      childrenIds: child.childrenIds,
      lucene: child.description,
      time: timeInMilliseconds(child),
      selfTime: child.selfTime,
      timePercentage: child.timePercentage,
      query_type: child.type.split('.').pop(),
      absoluteColor: child.absoluteColor,
      depth: depth,
      hasChildren: child.hasChildren,
      breakdown: child.breakdown,
    });

    visibleMap[child.id] = {
      visible: child.timePercentage > 20,
      children: child.children,
    };

    if (child.children != null && child.children.length !== 0) {
      flattenResults(child.children, accumulator, depth + 1, visibleMap);
    }
  }
}

export function closeNode(visibleMap, id) {
  visibleMap[id].visible = false;

  if (visibleMap[id].children == null || visibleMap[id].children.length === 0) {
    return;
  }

  for (const child of visibleMap[id].children) {
    closeNode(visibleMap, child.id);
  }
}
