/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { produce } from 'immer';
import { i18n } from '@kbn/i18n';
import tinycolor from 'tinycolor2';
import _ from 'lodash';

import { BreakdownItem, Index, Operation, Shard, Targets } from '../../types';
import { IndexMap } from './types';
import { MAX_TREE_DEPTH } from './constants';

export const comparator = (v1: number, v2: number) => {
  if (v1 < v2) {
    return 1;
  }
  return v1 > v2 ? -1 : 0;
};

function getToolTip(key: string) {
  switch (key) {
    case 'build_scorer':
      return i18n.translate('xpack.searchProfiler.buildScorerTimeDescription', {
        defaultMessage:
          'The time taken to create the Scoring object, which is later used to execute the actual scoring of each doc.',
      });
    case 'create_weight':
      return i18n.translate('xpack.searchProfiler.createWeightTimeDescription', {
        defaultMessage:
          'The time taken to create the Weight object, which holds temporary information during scoring.',
      });
    case 'next_doc':
      return i18n.translate('xpack.searchProfiler.nextDocTimeDescription', {
        defaultMessage: 'The time taken to advance the iterator to the next matching document.',
      });
    case 'score':
      return i18n.translate('xpack.searchProfiler.scoreTimeDescription', {
        defaultMessage: 'The time taken in actually scoring the document against the query.',
      });
    case 'match':
      return i18n.translate('xpack.searchProfiler.matchTimeDescription', {
        defaultMessage:
          'The time taken to execute a secondary, more precise scoring phase (used by phrase queries).',
      });
    case 'advance':
      return i18n.translate('xpack.searchProfiler.advanceTimeDescription', {
        defaultMessage: 'The time taken to advance the iterator to the next document.',
      });
    default:
      return '';
  }
}

export function timeInMilliseconds(data: any): number {
  if (data.time_in_nanos) {
    return data.time_in_nanos / 1000000;
  }

  if (typeof data.time === 'string') {
    return Number(data.time.replace('ms', ''));
  }

  return Number(data.time);
}

export function calcTimes(data: any[], parentId?: string) {
  let totalTime = 0;
  // First pass to collect total
  for (const child of data) {
    totalTime += timeInMilliseconds(child);

    child.breakdown = normalizeBreakdown(child.breakdown);

    let childrenTime = 0;
    if (child.children != null && child.children.length !== 0) {
      childrenTime = calcTimes(child.children, child.id)!;
      child.hasChildren = true;
    }
    child.selfTime = timeInMilliseconds(child) - childrenTime;
  }
  return totalTime;
}

export function normalizeBreakdown(breakdown: Record<string, number>) {
  const final: BreakdownItem[] = [];
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
        relative = ((breakdown[key] / total) * 100).toFixed(1) as any;
      }
      final.push({
        key,
        time: breakdown[key],
        relative,
        color: tinycolor.mix('#F5F5F5', '#FFAFAF', relative).toHexString(),
        tip: getToolTip(key),
      });
    });

  // Sort by time descending and then key ascending
  return final.sort((a, b) => {
    if (comparator(a.time, b.time) !== 0) {
      return comparator(a.time, b.time);
    }

    return -1 * comparator(a.key as any, b.key as any);
  });
}

export function normalizeIndices(indices: IndexMap, target: Targets) {
  // Sort the shards per-index
  let sortQueryComponents;
  if (target === 'searches') {
    sortQueryComponents = (a: Shard, b: Shard) => {
      const aTime = _.sum(a.searches!, search => {
        return search.treeRoot!.time;
      });
      const bTime = _.sum(b.searches!, search => {
        return search.treeRoot!.time;
      });

      return comparator(aTime, bTime);
    };
  } else if (target === 'aggregations') {
    sortQueryComponents = (a: Shard, b: Shard) => {
      const aTime = _.sum(a.aggregations!, agg => {
        return agg.treeRoot!.time;
      });
      const bTime = _.sum(b.aggregations!, agg => {
        return agg.treeRoot!.time;
      });

      return comparator(aTime, bTime);
    };
  }
  for (const index of Object.values(indices)) {
    index.shards.sort(sortQueryComponents);
    for (const shard of index.shards) {
      shard.relative = ((shard.time / index.time) * 100).toFixed(2);
      shard.color = tinycolor.mix('#F5F5F5', '#FFAFAF', shard.relative as any).toHexString();
    }
  }
}

export function normalizeTime(operation: Operation, totalTime: number) {
  operation.timePercentage = ((timeInMilliseconds(operation) / totalTime) * 100).toFixed(2);
  operation.absoluteColor = tinycolor
    .mix('#F5F5F5', '#FFAFAF', +operation.timePercentage)
    .toHexString();
}

export function initTree<T>(
  data: Operation[],
  totalTime: number,
  depth = 0,
  parent: Operation | null = null
) {
  if (MAX_TREE_DEPTH === depth) {
    return;
  }
  for (const child of data) {
    // For bwc of older profile responses
    if (!child.description) {
      child.description = child.lucene!;
      child.lucene = null;

      child.type = child.query_type!;
      child.query_type = null;
    }

    normalizeTime(child, totalTime);
    child.parent = parent;
    child.time = timeInMilliseconds(child);
    child.lucene = child.description;
    child.query_type = child.type!.split('.').pop()!;
    child.visible = +child.timePercentage > 20;
    child.depth = depth;

    if (child.children != null && child.children.length !== 0) {
      initTree(child.children, totalTime, depth + 1, child);
    }
  }

  data.sort((a, b) => comparator(timeInMilliseconds(a), timeInMilliseconds(b)));
}

export function closeNode<T = any>(node: Operation) {
  const closeDraft = (draft: Operation) => {
    draft.visible = false;

    if (draft.children == null || draft.children.length === 0) {
      return;
    }

    for (const child of draft.children) {
      closeDraft(child);
    }
  };
  return produce<Operation>(node, draft => {
    closeDraft(draft);
  });
}

export const sortIndices = (data: IndexMap) =>
  produce<IndexMap, Index[]>(data, doNotChange => {
    const sortedIndices: Index[] = [];
    for (const index of Object.values(doNotChange)) {
      sortedIndices.push(index);
    }
    // And now sort the indices themselves
    sortedIndices.sort((a, b) => comparator(a.time, b.time));
    return sortedIndices;
  });
