define(function (require) {
  var _ = require('lodash');
  var sinon = require('test_utils/auto_release_sinon');

  function GlobalState() {
    this.on = _.noop;
    this.off = _.noop;
    this.save = sinon.stub();
  }

  return new GlobalState();
});
