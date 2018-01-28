import { includes, mapValues } from 'lodash';
import { Notifier } from 'ui/notify/notifier';

/*
 * Caches notification attempts so each one is only actually sent to the
 * notifier service once per route.
 */
export function RouteBasedNotifierProvider($rootScope) {
  const notifier = new Notifier();

  let notifications = {
    warnings: []
  };

  // empty the tracked notifications whenever the route changes so we can start
  // fresh for the next route cycle
  $rootScope.$on('$routeChangeSuccess', () => {
    notifications = mapValues(notifications, () => []);
  });

  // Executes the given notify function if the message has not been seen in
  // this route cycle
  function executeIfNew(messages, message, notifyFn) {
    if (includes(messages, message)) {
      return;
    }

    messages.push(message);
    notifyFn.call(notifier, message);
  }

  return {
    /**
     * Notify a given warning once in this route cycle
     * @param {string} message
     */
    warning(message) {
      executeIfNew(
        notifications.warnings,
        message,
        notifier.warning
      );
    }
  };
}
