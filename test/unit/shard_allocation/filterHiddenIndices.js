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
  var filterHiddenIndices = require('panels/marvel/shard_allocation/lib/filterHiddenIndices');
  describe('shard_allocation', function() {
    describe('lib/filterHiddenIndices.js', function () {

      it('should return false for hidden indices', function () {
        expect(filterHiddenIndices({ index: '.marvel' })).to.equal(false);
      });

      it('should return true for non hidden indices', function () {
        expect(filterHiddenIndices({ index: 'marvel' })).to.equal(true); 
      });

    });
    
  });
});
