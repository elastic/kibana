/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { includes, mapValues } from 'lodash';
import { Notifier } from '../notify';

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
