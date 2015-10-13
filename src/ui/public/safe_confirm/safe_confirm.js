define(function (require) {
  require('ui/modules').get('kibana')

  /*
   * Angular doesn't play well with thread blocking calls such as
   * window.confirm() unless those calls are specifically handled inside a call
   * to $timeout(). Rather than litter the code with that implementation
   * detail, safeConfirm() can be used.
   *
   * WARNING: safeConfirm differs from a native call to window.confirm in that
   * it only blocks the thread beginning on the next tick. For that reason, a
   * promise is returned so consumers can handle the control flow.
   *
   * Usage:
   *  safeConfirm('This message will be passed to window.confirm()').then(
   *    function () {
   *      // user clicked confirm
   *    },
   *    function () {
   *      // user canceled the confirmation
   *    }
   *  );
   */
  .factory('safeConfirm', function ($window, $timeout, $q) {
    return function safeConfirm(message) {
      return $timeout(function () {
        return $window.confirm(message) || $q.reject(false);
      });
    };
  });
});
