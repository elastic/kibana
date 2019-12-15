/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { produce } from 'immer';
import { flow } from 'fp-ts/lib/function';
import { Targets, Shard, ShardSerialized } from '../../types';
import { calcTimes, normalizeTimes, initTree, normalizeIndices, sortIndices } from './unsafe_utils';
import { IndexMap } from './types';

/**
 * Functions prefixed with "mutate" change values by reference. Be careful when using these!
 *
 * It's recommended to us immer's `produce` functions to ensure immutability.
 */

export function mutateAggsTimesTree(shard: Shard) {
  if (shard.aggregations == null) {
    shard.time = 0;
  }
  let shardTime = 0;
  for (const agg of shard.aggregations!) {
    const totalTime = calcTimes([agg]);
    shardTime += totalTime;
  }
  for (const agg of shard.aggregations!) {
    normalizeTimes([agg], shardTime, 0);
    initTree([agg], 0);
  }
  shard.time = shardTime;
}

export function mutateSearchTimesTree(shard: Shard) {
  if (shard.searches == null) {
    shard.time = 0;
  }
  shard.rewrite_time = 0;

  let shardTime = 0;
  for (const search of shard.searches!) {
    shard.rewrite_time += search.rewrite_time!;
    const totalTime = calcTimes(search.query!);
    shardTime += totalTime;
    normalizeTimes(search.query!, totalTime, 0);
    initTree(search.query!, 0);
    search.treeRoot = search.query![0];
    search.query = null as any;
  }
  shard.time = shardTime;
}

const initShards = (data: ShardSerialized[]) =>
  produce<ShardSerialized[], Shard[]>(data, draft => {
    return draft.map(s => {
      const idMatch = s.id.match(/\[([^\]\[]*?)\]/g) || [];
      const ids = idMatch.map(id => {
        return id.replace('[', '').replace(']', '');
      });
      return {
        ...s,
        id: ids,
        time: 0,
        color: '',
        relative: 0,
      };
    });
  });

export const calculateShardValues = (target: Targets) => (data: Shard[]) =>
  produce<Shard[]>(data, draft => {
    for (const shard of draft) {
      if (target === 'searches') {
        mutateSearchTimesTree(shard);
      } else if (target === 'aggregations') {
        mutateAggsTimesTree(shard);
      }
    }
  });

export const initIndices = (data: Shard[]) =>
  produce<Shard[], IndexMap>(data, doNotChange => {
    const indices: IndexMap = {};

    for (const shard of doNotChange) {
      if (!indices[shard.id[1]]) {
        indices[shard.id[1]] = {
          shards: [],
          time: 0,
          name: shard.id[1],
          visible: false,
        };
      }
      indices[shard.id[1]].shards.push(shard);
      indices[shard.id[1]].time += shard.time;
    }

    return indices;
  });

export const normalize = (target: Targets) => (data: IndexMap) =>
  produce<IndexMap>(data, draft => {
    normalizeIndices(draft, target);
  });

export const initDataFor = (target: Targets) =>
  flow(initShards, calculateShardValues(target), initIndices, normalize(target), sortIndices);
