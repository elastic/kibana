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



define(function (require){
  var hasUnassigned = require('panels/marvel/shard_allocation/lib/hasUnassigned');

  describe('shard_allocation', function() {
    describe('lib/hasUnassigned.js', function () {

      it('should return true for unassigned shards', function () {
        expect(hasUnassigned({ unassigned: [1] })).to.equal(true);
      });

      it('should return false for empty unassigned shards', function () {
        expect(hasUnassigned({ unassigned: [] })).to.equal(false);
      });
      
    });
  });
});
