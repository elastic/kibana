define(function (require) {
  var _ = require('lodash');
  var sinon = require('test_utils/auto_release_sinon');

  function MockState() {
    this.on = _.noop;
    this.off = _.noop;
    this.save = sinon.stub();
  }

  MockState.prototype.resetStub = function () {
    this.save = sinon.stub();
    return this;
  };

  return MockState;
});
