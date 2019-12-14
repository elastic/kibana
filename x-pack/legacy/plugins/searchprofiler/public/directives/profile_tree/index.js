/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import template from 'plugins/searchprofiler/directives/profile_tree/index.html';
import {
  closeNode,
  normalizeIndices,
  calcTimes,
  normalizeTimes,
  flattenResults,
} from 'plugins/searchprofiler/directives/profile_tree/util';
import { uiModules } from 'ui/modules';

const uiModule = uiModules.get('app/searchprofiler/directives', []);
uiModule.directive('profiletree', HighlightService => {
  return {
    restrict: 'E',
    scope: {
      data: '=',
      target: '@',
    },
    template: template,
    link: $scope => {
      $scope.visible = {
        foo: {},
      };
      $scope.indexVisibility = {};
      $scope.highlightedRow = null;

      $scope.updateDetail = (row, indexName, shardID, shardNumber) => {
        HighlightService.details = row;
        HighlightService.details.indexName = indexName;
        HighlightService.details.shardID = shardID;
        HighlightService.details.shardNumber = shardNumber;
        HighlightService.details.highlightedRow = row.id;
      };

      $scope.getHighlightedRow = () => {
        if (HighlightService.details) {
          return HighlightService.details.highlightedRow;
        }
        return null;
      };

      $scope.toggle = id => {
        // If the branch is open and toggled close, we need to
        // also close the children
        if ($scope.visible[id].visible === true) {
          closeNode($scope.visible, id);
        } else {
          // Otherwise just toggle on
          $scope.visible[id].visible = true;
        }
      };

      function render(data) {
        if (data.length === 0) {
          return;
        }

        $scope.visible = {};
        let indices = {};

        for (const shard of data) {
          initShardTargets(shard);

          if ($scope.target === 'searches') {
            shard.time[$scope.target] = collectSearchTimes(shard);
          } else if ($scope.target === 'aggregations') {
            shard.time[$scope.target] = collectAggTimes(shard);
          }
          if (!indices[shard.id[1]]) {
            indices[shard.id[1]] = {
              shards: [],
              time: {
                searches: 0,
                aggregations: 0,
              },
              name: shard.id[1],
            };
          }
          indices[shard.id[1]].shards.push(shard);
          indices[shard.id[1]].time[$scope.target] += shard.time[$scope.target];
        }
        data = null;
        const finalIndices = normalizeIndices(indices, $scope.indexVisibility, $scope.target);
        indices = null;

        $scope.profileResponse = finalIndices;
      }

      function collectSearchTimes(shard) {
        if (shard.searches == null) {
          return 0;
        }
        shard.rewrite_time = 0;

        let shardTime = 0;
        for (const search of shard.searches) {
          shard.rewrite_time += search.rewrite_time;
          const totalTime = calcTimes(search.query);
          shardTime += totalTime;
          normalizeTimes(search.query, totalTime, 0);

          const flat = [];
          flattenResults(search.query, flat, 0, $scope.visible);
          search.flat = flat;
          search.query = null;
        }
        return shardTime;
      }

      function collectAggTimes(shard) {
        if (shard.aggregations == null) {
          return 0;
        }
        let shardTime = 0;
        for (const agg of shard.aggregations) {
          const totalTime = calcTimes([agg]);
          shardTime += totalTime;
        }
        for (const agg of shard.aggregations) {
          normalizeTimes([agg], shardTime, 0);

          const flat = [];
          flattenResults([agg], flat, 0, $scope.visible);
          agg.flat = flat;
        }
        return shardTime;
      }

      // TODO the addition of aggregation profiling made the mutability of
      // `shards` a liability.  Previously we set things directly on the shards
      // tree because it was the only source of data.  Now we have agg data,
      // so final, accumulated stats need to be saved on a per-target basis
      //
      // In the future, we should really remove this setup and create two immutable
      // result sets that are generated from a single (also immutable) input set of
      // `shards` data
      //
      // Particularly important if/when we add a third target
      function initShardTargets(shard) {
        if (!shard.time) {
          shard.time = {
            searches: 0,
            aggregations: 0,
          };
        }

        if (!shard.color) {
          shard.color = {
            searches: 0,
            aggregations: 0,
          };
        }

        if (!shard.relative) {
          shard.relative = {
            searches: 0,
            aggregations: 0,
          };
        }
      }

      $scope.$watch('data', render);
    },
  };
});
