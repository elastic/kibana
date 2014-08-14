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
  var incrementIndexShardStatusCount = require('lib/ClusterState/incrementIndexShardStatusCount');
  var shard = { index: 'test' };

  describe('lib/ClusterState', function() {
    describe('incrementIndexShardStatusCount.js', function() {
      
      it('should set index count to 1', function() {
        expect(incrementIndexShardStatusCount('unassigned')({}, shard))
          .to.have.property('test')
          .to.have.property('unassigned', 1); 
      });

      it('should set index count to 2 if it exists', function() {
        expect(incrementIndexShardStatusCount('unassigned')({ test: { unassigned: 1 } }, shard))
          .to.have.property('test')
          .to.have.property('unassigned', 2); 
      });

    });
  });  
});
