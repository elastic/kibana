define(function (require) {
  var _ = require('lodash');
  var module = require('ui/modules').get('kibana/marker_synchronizer');
  var SimpleEmitter = require('ui/utils/SimpleEmitter');

  module.factory('markerSync', function () {
    /**
     * Time Marker Synchronizer
     *
     * @class MarkerSynchronizer
     * @constructor
     * @extends SimpleEmitter
     */
    _.class(MarkerSynchronizer).inherits(SimpleEmitter);
    function MarkerSynchronizer() {
      MarkerSynchronizer.Super.call(this);
    }

    /**
     * Returns function that emits 'sync' event.
     *
     * @method hoverHandler
     * @returns {Function}
     */
    MarkerSynchronizer.prototype.hoverHandler = function () {
      var self = this;
      return function (e) {
        // ignore if not time based chart
        if (_.get(e, 'data.ordered.date')) {
          self.emit('sync', e);
        }
      };
    };

    return new MarkerSynchronizer;
  });
});
