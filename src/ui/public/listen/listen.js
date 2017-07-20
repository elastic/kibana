import { uiModules } from 'ui/modules';

uiModules.get('kibana')
.run(function ($rootScope) {

  /**
   * Helper that registers an event listener, and removes that listener when
   * the $scope is destroyed.
   *
   * @param  {EventEmitter} emitter - the event emitter to listen to
   * @param  {string} eventName - the event name
   * @param  {Function} handler - the event handler
   * @return {undefined}
   */
  $rootScope.constructor.prototype.$listen = function (emitter, eventName, handler) {
    emitter.on(eventName, handler);
    this.$on('$destroy', function () {
      emitter.off(eventName, handler);
    });
  };

});
