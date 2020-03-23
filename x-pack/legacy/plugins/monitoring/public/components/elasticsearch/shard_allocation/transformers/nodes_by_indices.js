/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { hasPrimaryChildren } from '../lib/has_primary_children';
import { decorateShards } from '../lib/decorate_shards';

export function nodesByIndices() {
  return function nodesByIndicesFn(shards, nodes) {
    const getNodeType = function(node) {
      const attrs = node.attributes || {};
      return attrs.master === 'true' ? 'master' : 'normal';
    };

    // NOTE: this seems to be used, but has no discernible effect in the UI
    function createNode(obj, node, id) {
      node.type = 'node';
      node.children = [];
      const nodeType = getNodeType(node);
      if (nodeType === 'normal' || nodeType === 'data') {
        obj[id] = node;
      }
      return obj;
    }

    function createIndexAddShard(obj, shard) {
      const node = shard.node || 'unassigned';
      const index = shard.index;
      if (!obj[node]) {
        createNode(obj, nodes[node], node);
      }
      let indexObj = _.find(obj[node].children, { id: index });
      if (!indexObj) {
        indexObj = {
          id: index,
          name: index,
          type: 'index',
          children: [],
        };
        obj[node].children.push(indexObj);
      }
      indexObj.children.push(shard);
      return obj;
    }

    function isUnassigned(shard) {
      return shard.state === 'UNASSIGNED';
    }

    let data = {};
    if (_.some(shards, isUnassigned)) {
      data.unassigned = {
        name: 'Unassigned',
        master: false,
        type: 'node',
        children: [],
      };
    }

    data = _.reduce(decorateShards(shards, nodes), createIndexAddShard, data);

    return _(data)
      .values()
      .sortBy(function(node) {
        return [node.name !== 'Unassigned', !node.master, node.name];
      })
      .map(function(node) {
        if (node.name === 'Unassigned') {
          node.unassignedPrimaries = node.children.some(hasPrimaryChildren);
        }
        return node;
      })
      .value();
  };
}
