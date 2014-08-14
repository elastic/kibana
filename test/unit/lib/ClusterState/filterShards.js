/**
 * ELASTICSEARCH CONFIDENTIAL
 * _____________________________
 *
 *  [2014] Elasticsearch Incorporated All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Elasticsearch Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Elasticsearch Incorporated
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Elasticsearch Incorporated.
 */



define(function (require) {
  'use strict';
  var filterShards = require('lib/ClusterState/filterShards');
  var shard = {
    state: 'STARTED',
    primary: true,
    relocating_node: null
  };

  describe('lib/ClusterState', function () {
    describe('filterShards.js', function () {    

      it('should return true for matching state and primary', function () {
        var fn = filterShards('STARTED', true);
        expect(fn(shard)).to.be.true;
      });

      it('should return false for matching state but not primary', function () {
        var fn = filterShards('STARTED', false);
        expect(fn(shard)).to.be.false;
      });

      it('should return true for matching relocating shards', function () {
        var shard = {
          state: 'INITIALIZING',
          primary: true,
          relocating_node: '21993'
        };
        var fn = filterShards('INITIALIZING', true, true);
        expect(fn(shard)).to.be.true;
      });

    }); 
  });  
});
