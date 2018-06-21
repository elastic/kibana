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

import { uiModules } from '../modules';

uiModules.get('kibana')
  .run(function ($rootScope) {

    /**
     * Helper that registers an event listener, and removes that listener when
     * the $scope is destroyed.
     *
     * @param  {SimpleEmitter} emitter - the event emitter to listen to
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

    /**
     * Helper that registers an event listener, and removes that listener when
     * the $scope is destroyed. Handler is executed inside $evalAsync, ensuring digest cycle is run after the handler
     *
     * @param  {SimpleEmitter} emitter - the event emitter to listen to
     * @param  {string} eventName - the event name
     * @param  {Function} handler - the event handler
     * @return {undefined}
     */
    $rootScope.constructor.prototype.$listenAndDigestAsync = function (emitter, eventName, handler) {
      const evalAsyncWrappedHandler = (...args) => {
        this.$evalAsync(() => handler(args));
      };
      this.$listen(emitter, eventName, evalAsyncWrappedHandler);
    };

  });
