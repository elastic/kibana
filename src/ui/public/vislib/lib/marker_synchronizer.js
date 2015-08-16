define(function (require) {
  var _ = require('lodash');
  var module = require('ui/modules').get('kibana/marker_synchronizer');
  var SimpleEmitter = require('ui/utils/SimpleEmitter');

  module.factory('markerSync', function () {
    _.class(MarkerSynchronizer).inherits(SimpleEmitter);
    function MarkerSynchronizer() {
      MarkerSynchronizer.Super.call(this);
      this._listeners = {};
    }

    MarkerSynchronizer.prototype.handler = function () {
      var self = this;
      return function (e) {
        console.log('emit sync');
        self.emit('sync', e);
      };
    };

    return new MarkerSynchronizer;
  });
});
