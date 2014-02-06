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
