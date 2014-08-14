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
  var calculateClass = require('panels/marvel/shard_allocation/lib/calculateClass');
  describe('shard_allocation', function () {
    describe('lib/calculateClass.js', function() {

      beforeEach(function () {
        this.item = {
          type: 'shard',
          primary: true,
          state: 'UNASSIGNED',
          master: true
        };
      });

      function testForClass (className) {
        it('should add the '+className+' class', function() {
          expect(calculateClass(this.item)).to.contain(className);
        });
      }

      testForClass('shard');
      testForClass('primary');
      testForClass('master');
      testForClass('emergency');
      testForClass('unassigned');

      it('should preserve initial classes', function () {
        var classes = calculateClass(this.item, 'test');
        expect(classes).to.contain('unassigned');
        expect(classes).to.contain('test');
      });

    });

  });
});
