define(function (require) {
  return function ReflowWatcherService(Private, $rootScope, $http) {
    let angular = require('angular');
    let $ = require('jquery');
    let _ = require('lodash');

    let EventEmitter = Private(require('ui/events'));
    let $body = $(document.body);
    let $window = $(window);

    let MOUSE_EVENTS = 'mouseup';
    let WINDOW_EVENTS = 'resize';

    _.class(ReflowWatcher).inherits(EventEmitter);
    /**
     * Watches global activity which might hint at a change in the content, which
     * in turn provides a hint to resizers that they should check their size
     */
    function ReflowWatcher() {
      ReflowWatcher.Super.call(this);

      // bound version of trigger that can be used as a handler
      this.trigger = _.bind(this.trigger, this);
      this._emitReflow = _.bind(this._emitReflow, this);

      // list of functions to call that will unbind our watchers
      this._unwatchers = [
        $rootScope.$watchCollection(function () {
          return $http.pendingRequests;
        }, this.trigger)
      ];

      $body.on(MOUSE_EVENTS, this.trigger);
      $window.on(WINDOW_EVENTS, this.trigger);
    }

    /**
     * Simply emit reflow, but in a way that can be bound and passed to
     * other functions. Using _.bind caused extra arguments to be added, and
     * then emitted to other places. No Bueno
     *
     * @return {void}
     */
    ReflowWatcher.prototype._emitReflow = function () {
      this.emit('reflow');
    };

    /**
     * Emit the "reflow" event in the next tick of the digest cycle
     * @return {void}
     */
    ReflowWatcher.prototype.trigger = function () {
      $rootScope.$evalAsync(this._emitReflow);
    };

    /**
     * Signal to the ReflowWatcher that it should clean up it's listeners
     * @return {void}
     */
    ReflowWatcher.prototype.destroy = function () {
      $body.off(MOUSE_EVENTS, this.trigger);
      $window.off(WINDOW_EVENTS, this.trigger);
      _.callEach(this._unwatchers);
    };

    return new ReflowWatcher();
  };
});
