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
  var vents = require('panels/marvel/shard_allocation/lib/vents');
  describe('shard_allocation', function () {
    describe('lib/vents.js', function () {

      it('should create a new listener', function () {
        var test = function () {  };
        expect(vents.vents.test).to.not.be.instanceOf(Array);
        vents.on('test', test);
        expect(vents.vents)
          .to.have.property('test')
          .to.be.instanceOf(Array)
          .to.contain(test);
      });

      it('should remove a listner', function () {
        var test = function () {  };
        vents.on('test', test);
        vents.clear('test');
        expect(vents.vents)
          .to.not.have.property('test');
      });

      it('should trigger events with arguments', function () {
        var test = sinon.stub(); 
        vents.on('test', test);
        vents.trigger('test', 'foo');
        sinon.assert.calledOnce(test);
        sinon.assert.calledWith(test, 'foo');
      });

    });
  });
});
